// import { startWebsocketServer } from './websocket_server';
import { httpServer } from './http_server';
import './websocket_server/index';

const HTTP_PORT = 8181;

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);
