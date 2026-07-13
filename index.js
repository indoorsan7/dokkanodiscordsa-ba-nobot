const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField 
} = require('discord.js');
const http = require('http');

// Render等の本番環境用 Webサーバー
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('bot is alive!');
});
server.listen(8000, () => console.log('Web server running on port 8000'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

// 環境変数から直接トークンを取得
const TOKEN = process.env.DISCORD_TOKEN;

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// チケット作成コマンド
client.on('messageCreate', async (message) => {
    if (message.content === '!ticket') {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('チケットを作成')
                    .setStyle(ButtonStyle.Primary)
            );

        await message.channel.send({ 
            content: '以下のボタンを押してサポートチケットを作成してください。', 
            components: [row] 
        });
    }
});

// ボタン処理
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'create_ticket') {
        const guild = interaction.guild;
        const channel = await guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });

        await interaction.reply({ 
            content: `チケットを作成しました: ${channel}`, 
            ephemeral: true 
        });
    }
});

client.login(TOKEN);
