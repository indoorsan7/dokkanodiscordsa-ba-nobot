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
    SlashCommandBuilder,
    EmbedBuilder // Embed用に追加
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
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// コマンド登録用設定
const commands = [
    new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('チケット作成用Embedを表示します')
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
            
            // ==========================================
            // 📝 ここで Embed の内容を自由に変更できます
            // ==========================================
            const embedTitle = 'サポートチケット'; // ← タイトル（絶対）
            const embedDescription = '以下のボタンを押してサポートチケットを作成してください。スタッフが対応いたします。'; // ← 説明（絶対）
            const embedColor = '#3498db'; // ← カラー（自由：カラーコードやBlueなどの指定が可能）

            const ticketEmbed = new EmbedBuilder()
                .setTitle(embedTitle)
                .setDescription(embedDescription)
                .setColor(embedColor);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_ticket')
                        .setLabel('チケットを作成')
                        .setStyle(ButtonStyle.Primary)
                );
            
            await interaction.reply({ embeds: [ticketEmbed], components: [row] });
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
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const content = message.content;
    const now = Date.now();

    if (!messageHistory.has(userId)) {
        messageHistory.set(userId, []);
    }

    const userHistory = messageHistory.get(userId);

    const recentMessages = userHistory.filter(item => 
        now - item.timestamp < 60000 && item.content === content
    );

    recentMessages.push({ content, timestamp: now });
    
    messageHistory.set(userId, [...userHistory.filter(item => now - item.timestamp < 60000), { content, timestamp: now }]);

    if (recentMessages.length >= 5) {
        try {
            const member = await message.guild.members.fetch(userId);
            await member.timeout(5 * 60 * 1000, '同じメッセージの連続投稿（スパム）のため');
            await message.channel.send(`${message.author} さん、同じメッセージが連続して投稿されたため、5分間のタイムアウト処分となりました。`);
            messageHistory.delete(userId);
        } catch (error) {
            console.error('タイムアウトの適用に失敗しました:', error);
        }
    }
});

client.login(TOKEN);
