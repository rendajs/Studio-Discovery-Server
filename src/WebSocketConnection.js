import { generateUuid } from "https://raw.githubusercontent.com/rendajs/Renda/7adb3535329160690dbc6c136eca6327e9082c73/src/util/util.js";

export class WebSocketConnection {
	#webSocketManager;
	#remoteAddress;
	#id;
	get id() {
		return this.#id;
	}
	#rawConnection;

	get clientType() {
		return "studio"; // todo: support for setting this from client
	}
	#projectMetaData = null;

	#firstIsHostMessageReceived = false;
	#isStudioHost = false;

	/**
	 * @param {import("./WebSocketManager.js").WebSocketManager} webSocketManager
	 * @param {string} remoteAddress
	 * @param {WebSocket} rawConnection
	 */
	constructor(webSocketManager, remoteAddress, rawConnection) {
		this.#webSocketManager = webSocketManager;
		this.#remoteAddress = remoteAddress;
		this.#id = generateUuid();
		this.#rawConnection = rawConnection;

		this.#rawConnection.addEventListener("message", this.onMessage.bind(this));
	}

	/**
	 * @param {MessageEvent} message
	 */
	onMessage(message) {
		let data = null;
		try {
			data = JSON.parse(message.data);
		} catch (e) {
			console.error("Failed to parse message: " + message.data);
		}

		if (!data) return;
		const { op } = data;
		if (!op) return;

		if (op == "setIsStudioHost") {
			const newIsHost = !!data.isHost;
			if (newIsHost == this.#isStudioHost && this.#firstIsHostMessageReceived) return;
			this.#isStudioHost = newIsHost;
			this.#firstIsHostMessageReceived = true;
			if (this.#isStudioHost) {
				this.notifyNearbyHostConnectionsAdd();
			} else {
				this.sendNearbyHostConnectionsList();
			}
		} else if (op == "projectMetaData") {
			const { projectMetaData } = data;
			this.#projectMetaData = projectMetaData;
			this.notifyNearbyHostConnectionsUpdateProjectMetaData();
		} else if (op == "relayMessage") {
			const { toUuid, data: relayData } = data;
			if (!toUuid || !relayData) return;
			const toConnection = this.#webSocketManager.getConnection(toUuid);
			if (!toConnection) return;
			toConnection.sendRelayData(this.#id, relayData);
		}
	}

	onClose() {
		if (this.#isStudioHost) {
			this.notifyNearbyHostConnectionsRemove();
		}
	}

	/**
	 * @param {*} data
	 */
	send(data) {
		this.#rawConnection.send(JSON.stringify(data));
	}

	getConnectionData() {
		return {
			id: this.#id,
			clientType: this.clientType,
			projectMetaData: this.#projectMetaData,
		};
	}

	sendNearbyHostConnectionsList() {
		const connectionsData = [];
		for (const connection of this.#webSocketManager.getConnectionsByRemoteAddress(this.#remoteAddress)) {
			if (!connection.#isStudioHost) continue;
			connectionsData.push(connection.getConnectionData());
		}
		this.send({
			op: "nearbyHostConnectionsList",
			connections: connectionsData,
		});
	}

	notifyNearbyHostConnectionsAdd() {
		for (const connection of this.#webSocketManager.getConnectionsByRemoteAddress(this.#remoteAddress)) {
			if (connection.#isStudioHost) continue;

			connection.sendNearbyHostConnectionAdded(this);
		}
	}

	notifyNearbyHostConnectionsRemove() {
		for (const connection of this.#webSocketManager.getConnectionsByRemoteAddress(this.#remoteAddress)) {
			if (connection.#isStudioHost) continue;

			connection.sendNearbyHostConnectionRemoved(this);
		}
	}

	notifyNearbyHostConnectionsUpdateProjectMetaData() {
		for (const connection of this.#webSocketManager.getConnectionsByRemoteAddress(this.#remoteAddress)) {
			if (connection.#isStudioHost) continue;

			connection.sendNearbyHostConnectionUpdateProjectMetaData(this);
		}
	}

	/**
	 * @param {WebSocketConnection} connection
	 */
	sendNearbyHostConnectionAdded(connection) {
		this.send({
			op: "nearbyHostConnectionAdded",
			connection: connection.getConnectionData(),
		});
	}

	/**
	 * @param {WebSocketConnection} connection
	 */
	sendNearbyHostConnectionRemoved(connection) {
		this.send({
			op: "nearbyHostConnectionRemoved",
			id: connection.#id,
		});
	}

	/**
	 * @param {WebSocketConnection} connection
	 */
	sendNearbyHostConnectionUpdateProjectMetaData(connection) {
		this.send({
			op: "nearbyHostConnectionUpdateProjectMetaData",
			id: connection.#id,
			projectMetaData: connection.#projectMetaData,
		});
	}

	/**
	 * @param {string} fromUuid
	 * @param {*} data
	 */
	sendRelayData(fromUuid, data) {
		this.send({
			op: "relayMessage",
			fromUuid,
			data,
		});
	}
}
