import { WebSocketConnection } from "./WebSocketConnection.js";

export class WebSocketManager {
	/** @type {Map<string, WebSocketConnection>} */
	#activeConnections = new Map();

	/** @type {Map<string, Set<WebSocketConnection>>} */
	#connectionsByRemoteAddress = new Map();

	/**
	 * @param {Request} request
	 * @param {import("https://deno.land/std@0.181.0/http/server.ts").ConnInfo} connInfo
	 */
	handleRequest(request, connInfo) {
		const { socket, response } = Deno.upgradeWebSocket(request);
		if (connInfo.remoteAddr.transport != "tcp" && connInfo.remoteAddr.transport != "udp") {
			throw new Error("Invalid connection type");
		}
		// We use cf-connecting-ip instead of X-Forwarded-For
		// because the later could be a list of ips and we're only interested in a single one.
		const cfConnectingIp = request.headers.get("cf-connecting-ip");
		const remoteAddress = cfConnectingIp || connInfo.remoteAddr.hostname;
		const connection = new WebSocketConnection(this, remoteAddress, socket);
		this.#activeConnections.set(connection.uuid, connection);

		let connections = this.#connectionsByRemoteAddress.get(remoteAddress);
		if (!connections) {
			connections = new Set();
			this.#connectionsByRemoteAddress.set(remoteAddress, connections);
		}
		connections.add(connection);

		socket.addEventListener("close", () => {
			connection.onClose();
			this.#activeConnections.delete(connection.uuid);
			const connections = this.#connectionsByRemoteAddress.get(remoteAddress);
			if (connections) {
				connections.delete(connection);
				if (connections.size <= 0) {
					this.#connectionsByRemoteAddress.delete(remoteAddress);
				}
			}
		});
		return response;
	}

	/**
	 * @param {string} remoteAddress
	 */
	*getConnectionsByRemoteAddress(remoteAddress) {
		const connections = this.#connectionsByRemoteAddress.get(remoteAddress);
		if (connections) {
			yield* connections;
		}
	}

	/**
	 * @param {string} uuid
	 */
	getConnection(uuid) {
		return this.#activeConnections.get(uuid);
	}
}
