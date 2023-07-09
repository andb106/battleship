import WebSocket, { WebSocketServer } from 'ws';
import { BaseMessage, ServerRegMessage } from './models';

const WSS_PORT = 3000;

interface PlayerData {
  id: number;
  password: string;
  name: string;
}

interface RoomData {
  roomId: number;
  roomUsers: {
    name: string | undefined;
    index: number | undefined;
  }[];
}

let INITIAL_PLAYER_INDEX = 0;
let INITIAL_ROOM_INDEX = 100;

const users: Map<WebSocket, PlayerData> = new Map();

const roomsStorage: RoomData[] = [];

const wss = new WebSocketServer({ port: WSS_PORT });
console.log(`Start websocket server on the ${WSS_PORT} port!`);

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    const parsedMessage = JSON.parse(data.toString());
    const typeMessage = parsedMessage.type;

    console.log('data from frontend -->', parsedMessage);
    console.log('roomsStorage -->', roomsStorage);
    console.log('users.values -->', Array.from(users.values()));

    const updatedRooms = {
      type: 'update_room',
      data: roomsStorage,
      id: 0,
    };

    switch (typeMessage) {
      case 'reg':
        const name = JSON.parse(parsedMessage.data).name;
        const password = JSON.parse(parsedMessage.data).password;

        const playerData = { id: ++INITIAL_PLAYER_INDEX, password, name };

        users.set(ws, playerData);

        const regDataTest: ServerRegMessage = {
          type: 'reg',
          data: {
            name: playerData.name,
            index: playerData.id,
            error: false,
            errorText: '',
          },
          id: 0,
        };

        ws.send(messageToJsonString(regDataTest));
        break;

      case 'create_room':
        const newRoom = {
          roomId: ++INITIAL_ROOM_INDEX,
          roomUsers: [
            {
              name: users.get(ws)?.name,
              index: users.get(ws)?.id,
            },
          ],
        };

        roomsStorage.push(newRoom);

        // update rooms

        wss.clients.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(messageToJsonString(updatedRooms));
          }
        });

        break;

      case 'add_user_to_room':
        console.log('add_user_to_room -->', parsedMessage);

        const roomIdFromMessage = JSON.parse(parsedMessage.data).indexRoom;

        // create game

        const roomIndexForGame = roomsStorage.findIndex(
          (room) => room.roomId === roomIdFromMessage,
        );

        const roomUserId = roomsStorage[roomIndexForGame]?.roomUsers[0]?.index;

        const currentUserId = users.get(ws)?.id;

        const createGameForCurrentUser = {
          type: 'create_game',
          data: {
            idGame: roomIdFromMessage,
            idPlayer: currentUserId,
          },
          id: 0,
        };

        const createGameForRoomUser = {
          type: 'create_game',
          data: {
            idGame: roomIdFromMessage,
            idPlayer: roomUserId,
          },
          id: 0,
        };

        if (currentUserId !== roomUserId) {
          ws.send(messageToJsonString(createGameForCurrentUser));
          users.forEach((value, key) => {
            if (value.id === roomUserId) {
              key.send(messageToJsonString(createGameForRoomUser));
            }
          });

          // update rooms
          roomsStorage.splice(roomIndexForGame, 1);
          wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(messageToJsonString(updatedRooms));
            }
          });
        }

        break;

      default:
        break;
    }
  });
});

function messageToJsonString(message: BaseMessage<unknown>) {
  const fieldDataToJsonString = JSON.stringify(message.data);
  return JSON.stringify({ ...message, data: fieldDataToJsonString });
}
