// ローカル環境でのみdotenvを読み込む
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

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

// Renderのヘルスチェック用Webサーバー
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('bot is alive!');
});
server.listen(8000, () => console.log('Web server running on port 8000'));

// ボットのクライアント設定
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

// Renderの環境変数からトークンを取得
const TOKEN = process.env.DISCORD_TOKEN;

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// チケット作成ボタンを送信するコマンド
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

// ボタン操作の処理
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'create_ticket') {
        const guild = interaction.guild;
        // チケットチャンネルを作成
        const channel = await guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.id, // @everyone
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id, // 作成者
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
