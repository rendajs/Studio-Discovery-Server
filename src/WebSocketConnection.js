import { generateUuid } from "https://raw.githubusercontent.com/rendajs/Renda/015df2634a012df1fdd144f059dcdcb17d3aa51e/src/util/util.js";
import { TypedMessenger } from "https://raw.githubusercontent.com/rendajs/Renda/015df2634a012df1fdd144f059dcdcb17d3aa51e/src/util/TypedMessenger.js";

/**
 * @typedef {ReturnType<WebSocketConnection["getResponseHandlers"]>} StudioDescoveryResponseHandlers
 */

export class WebSocketConnection {
	#webSocketManager;
	#remoteAddress;
	#uuid;
	get uuid() {
		return this.#uuid;
	}

	/** @type {TypedMessenger<StudioDescoveryResponseHandlers, import("https://raw.githubusercontent.com/rendajs/Renda/015df2634a012df1fdd144f059dcdcb17d3aa51e/src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").ExternalDiscoveryManagerResponseHandlers>} */
	#messenger;

	/** @type {import("https://raw.githubusercontent.com/rendajs/Renda/015df2634a012df1fdd144f059dcdcb17d3aa51e/src/network/studioConnections/DiscoveryManager.js").ClientType?} */
	#clientType = null;

	/** @type {import("https://raw.githubusercontent.com/rendajs/Renda/015df2634a012df1fdd144f059dcdcb17d3aa51e/src/network/studioConnections/DiscoveryManager.js").RemoteStudioMetadata?} */
	#projectMetadata = null;

	/**
	 * @param {import("./WebSocketManager.js").WebSocketManager} webSocketManager
	 * @param {string} remoteAddress
	 * @param {WebSocket} rawConnection
	 */
	constructor(webSocketManager, remoteAddress, rawConnection) {
		this.#webSocketManager = webSocketManager;
		this.#remoteAddress = remoteAddress;
		this.#uuid = generateUuid();

		this.#messenger = new TypedMessenger();
		this.#messenger.initializeWebSocket(rawConnection, this.getResponseHandlers());
		this.#messenger.configureSendOptions({
			addAvailableConnection: {
				expectResponse: false,
			},
			removeAvailableConnection: {
				expectResponse: false,
			},
			setAvailableConnections: {
				expectResponse: false,
			},
			setConnectionProjectMetadata: {
				expectResponse: false,
			},
			relayMessage: {
				expectResponse: false,
			},
		});
	}

	getResponseHandlers() {
		const disableResponseReturn = /** @satisfies {import("https://raw.githubusercontent.com/rendajs/Renda/015df2634a012df1fdd144f059dcdcb17d3aa51e/src/util/TypedMessenger.js").TypedMessengerRequestHandlerReturn} */ {
			$respondOptions: {
				respond: false,
			},
		};

		return {
			/**
			 * Sets the client type of your client.
			 * @param {import("https://raw.githubusercontent.com/rendajs/Renda/015df2634a012df1fdd144f059dcdcb17d3aa51e/src/network/studioConnections/DiscoveryManager.js").ClientType} clientType True if the client has an available project.
			 */
			registerClient: (clientType) => {
				if (this.#clientType) {
					throw new Error("A client has already been registered. Clients can only be registered once. If you wish to use a different client type, you should create a new connection.");
				}
				this.#clientType = clientType;
				this.#notifyNearbyHostConnectionsAdd();
				this.#sendNearbyHostConnectionsList();
			},
			/**
			 * @param {import("https://raw.githubusercontent.com/rendajs/Renda/015df2634a012df1fdd144f059dcdcb17d3aa51e/src/network/studioConnections/DiscoveryManager.js").RemoteStudioMetadata?} projectMetadata
			 */
			setProjectMetadata: (projectMetadata) => {
				this.#projectMetadata = projectMetadata;
				this.#notifyNearbyHostConnectionsUpdateProjectMetadata();
				return disableResponseReturn;
			},
			/**
			 * Sends arbitrary data to another client that is currently connected.
			 * @param {import("https://raw.githubusercontent.com/rendajs/Renda/015df2634a012df1fdd144f059dcdcb17d3aa51e/src/util/util.js").UuidString} otherClientUuid
			 * @param {import("https://raw.githubusercontent.com/rendajs/Renda/015df2634a012df1fdd144f059dcdcb17d3aa51e/src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").ExternalDiscoveryRelayData} data
			 */
			relayMessage: (otherClientUuid, data) => {
				if (otherClientUuid && data) {
					const toConnection = this.#webSocketManager.getConnection(otherClientUuid);
					if (toConnection) {
						toConnection.#messenger.send.relayMessage(this.#uuid, data);
					}
				}
				return disableResponseReturn;
			},
		};
	}

	onClose() {
		if (this.#clientType) {
			this.#notifyNearbyHostConnectionsRemove();
		}
	}

	/** @returns {import("https://raw.githubusercontent.com/rendajs/Renda/015df2634a012df1fdd144f059dcdcb17d3aa51e/src/network/studioConnections/DiscoveryManager.js").AvailableStudioData?} */
	#getConnectionData() {
		if (!this.#clientType) return null;
		return {
			id: this.#uuid,
			clientType: this.#clientType,
			projectMetadata: this.#projectMetadata,
		};
	}

	#sendNearbyHostConnectionsList() {
		/** @type {import("https://raw.githubusercontent.com/rendajs/Renda/015df2634a012df1fdd144f059dcdcb17d3aa51e/src/network/studioConnections/DiscoveryManager.js").AvailableStudioData[]} */
		const connectionsData = [];
		for (const connection of this.#webSocketManager.getConnectionsByRemoteAddress(this.#remoteAddress)) {
			if (connection == this) continue;
			const connectionData = connection.#getConnectionData();
			if (!connectionData) continue;
			connectionsData.push(connectionData);
		}
		this.#messenger.send.setAvailableConnections(connectionsData);
	}

	#notifyNearbyHostConnectionsAdd() {
		const connectionData = this.#getConnectionData();
		if (!connectionData) return;
		for (const connection of this.#webSocketManager.getConnectionsByRemoteAddress(this.#remoteAddress)) {
			if (connection == this) continue;
			connection.#messenger.send.addAvailableConnection(connectionData);
		}
	}

	#notifyNearbyHostConnectionsRemove() {
		for (const connection of this.#webSocketManager.getConnectionsByRemoteAddress(this.#remoteAddress)) {
			if (connection == this) continue;

			connection.#messenger.send.removeAvailableConnection(this.#uuid);
		}
	}

	#notifyNearbyHostConnectionsUpdateProjectMetadata() {
		for (const connection of this.#webSocketManager.getConnectionsByRemoteAddress(this.#remoteAddress)) {
			if (connection.#clientType) continue;

			connection.#messenger.send.setConnectionProjectMetadata(this.#uuid, this.#projectMetadata);
		}
	}
}
