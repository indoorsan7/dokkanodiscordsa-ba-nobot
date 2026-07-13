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

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
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

// スラッシュコマンド処理
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

client.login(TOKEN);
