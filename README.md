# Studio Discovery Server

This repository contains the code responsible for hosting the discovery server.
This server allows multiple studio clients to connect to each other via WebRTC.

The server is a rather straight forward websocket application,
which sends updates to clients about which other clients are available.
When a client chooses to connect to another client,
this server also facilitates the messaging required for setting up the WebRTC connection.

At the moment no stun/turn functionality is included. So for now the clients that can connect to each other are rather limited.
But it should at least be possible to connect two browsers on the same device.
Depending on your network configuration, you might also be able connect two devices on the same network.
The discovery server only lists other clients that have the same ip as yours, so for now stun/turn is not really needed.
But when rooms are added with the possibility to connect users over longer distances, at least stun would be required.

## Running the server

This repository does not contain any code that is required to start the server.
This is because normally the server will be run as part of another program.
On renda.studio for instance, this code will be imported from the [domain server](https://github.com/rendajs/domain-server).

If you wish to make changes to this repository and try them out,
you can clone the [Renda's main repository](https://github.com/rendajs/Renda) and run `deno task dev`.
If you have cloned both repositories to the same directory and with the correct name,
the Renda dev script will automatically use the code from this repository.
For example, if Renda's main repository has been cloned to `~/Documents/repositories/Renda/`
then this repository should be located at `~/Documents/repositories/studio-discovery-server/`.

When this repository has not been cloned, the discovery server will still be started from the dev script,
it will just be imported from raw.githubusercontent.com directly as opposed to from the local file system.

## Type checking

Run `deno task dev` to generate the type files to get correct type checking in your IDE.
