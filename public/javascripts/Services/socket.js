let socket = io.connect('http://localhost:3000');

export const getSocket = () => socket;
