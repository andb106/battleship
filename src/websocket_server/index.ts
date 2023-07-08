import { WebSocketServer } from 'ws';
import { BaseMessage, ServerRegMessage } from './models';

const WSS_PORT = 3000;

const wss = new WebSocketServer({ port: WSS_PORT });
console.log(`Start websocket server on the ${WSS_PORT} port!`);

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    const parsedMessage = JSON.parse(data.toString());
    const typeMessage = parsedMessage.type;

    switch (typeMessage) {
      case 'reg':
        console.log('reg data received -->', parsedMessage);

        const regDataTest: ServerRegMessage = {
          type: 'reg',
          data: {
            name: '12345',
            index: 12345,
            error: false,
            errorText: '',
          },
          id: 0,
        };

        ws.send(messageToJsonString(regDataTest));
        break;

      default:
        break;
    }
  });
});

function messageToJsonString(message: BaseMessage<unknown>) {
  const messageJSON = JSON.stringify(message.data);
  return JSON.stringify({ ...message, data: JSON.stringify(messageJSON) });
}
