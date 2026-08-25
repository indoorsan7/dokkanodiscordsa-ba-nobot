const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');
const http = require('http');

// Webサーバー
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('bot is alive!');
});
server.listen(8000, () => console.log('Web server running on port 8000'));

// ユーザーごとのメッセージ履歴を保存するマップ（スパム対策用）
const messageHistory = new Map();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages, // メッセージの監視に必要
        GatewayIntentBits.MessageContent   // メッセージの内容取得に必要
    ] 
});
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // Renderの環境変数に設定してください

// コマンド登録用設定
const commands = [
    new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('チケット作成用ボタンを表示します')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// コマンドの登録
client.once('ready', async () => {
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Successfully registered /ticket command.');
    } catch (error) {
        console.error(error);
    }
    console.log(`Logged in as ${client.user.tag}!`);
});

// スラッシュコマンドおよびボタン操作処理
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'ticket') {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_ticket')
                        .setLabel('チケットを作成')
                        .setStyle(ButtonStyle.Primary)
                );
            await interaction.reply({ content: '以下のボタンを押してサポートチケットを作成してください。', components: [row] });
        }
    }

    // ボタン操作処理
    if (interaction.isButton() && interaction.customId === 'create_ticket') {
        const guild = interaction.guild;
        const channel = await guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            ],
        });
        await interaction.reply({ content: `チケットを作成しました: ${channel}`, ephemeral: true });
    }
});

// スパム検知（同じメッセージが1分以内に5回投稿されたら5分タイムアウト）
client.on('messageCreate', async (message) => {
    // BotのメッセージやDMは無視
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const content = message.content;
    const now = Date.now();

    if (!messageHistory.has(userId)) {
        messageHistory.set(userId, []);
    }

    const userHistory = messageHistory.get(userId);

    // 1分以内（60,000ミリ秒）の履歴のみ保持し、かつ同じ内容のメッセージを抽出
    const recentMessages = userHistory.filter(item => 
        now - item.timestamp < 60000 && item.content === content
    );

    // 今回のメッセージを追加
    recentMessages.push({ content, timestamp: now });
    
    // 履歴を更新（最新のものを保存）
    messageHistory.set(userId, [...userHistory.filter(item => now - item.timestamp < 60000), { content, timestamp: now }]);

    // 同じメッセージが5回に達した場合
    if (recentMessages.length >= 5) {
        try {
            const member = await message.guild.members.fetch(userId);
            
            // 5分間（5 * 60 * 1000ミリ秒）のタイムアウトを適用
            await member.timeout(5 * 60 * 1000, '同じメッセージの連続投稿（スパム）のため');
            
            await message.channel.send(`${message.author} さん、同じメッセージが連続して投稿されたため、5分間のタイムアウト処分となりました。`);
            
            // 処理後に履歴をクリア
            messageHistory.delete(userId);
        } catch (error) {
            console.error('タイムアウトの適用に失敗しました:', error);
        }
    }
});

client.login(TOKEN);
