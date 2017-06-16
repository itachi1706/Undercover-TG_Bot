/**
 * Created by Kenneth on 16/6/2017.
 */
// Listen for any kind of message. There are different kinds of
// messages.
console.log('Registering sent messages');
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

// send a message to the chat acknowledging receipt of their message
    bot.sendMessage(chatId, 'Received your message');
});

// Matches "/echo [whatever]"
console.log('Registering echo command');
bot.onText(/\/echo (.+)/, (msg, match) => {
    // 'msg' is the received Message from Telegram
    // 'match' is the result of executing the regexp above on the text content of the message=
    const chatId = msg.chat.id;
    const resp = match[1]; // the captured "whatever"
    bot.sendMessage(chatId, resp); // send back the matched "whatever" to the chat
});