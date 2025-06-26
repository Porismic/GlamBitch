
import discord
from discord.ext import commands
from discord import app_commands
import json
import os
import re
from datetime import datetime, timedelta
from typing import Optional, List
import asyncio

# Your server's Guild ID
GUILD_ID = 1384268371452756089

# Configuration file for role permissions
CONFIG_FILE = "role_config.json"
POLLS_FILE = "active_polls.json"
PREVIEWS_FILE = "poll_previews.json"
STICKY_NOTES_FILE = "sticky_notes.json"

class PollBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        intents.members = True
        
        super().__init__(command_prefix='!', intents=intents)
        
        # Load role configuration
        self.role_config = self.load_config()
        self.active_polls = self.load_polls()
        self.poll_previews = self.load_previews()
        self.sticky_notes = self.load_sticky_notes()
    
    def load_config(self):
        """Load role configuration from file"""
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        return {"enabled_roles": {}}
    
    def save_config(self):
        """Save role configuration to file"""
        with open(CONFIG_FILE, 'w') as f:
            json.dump(self.role_config, f, indent=2)
    
    def load_polls(self):
        """Load active polls from file"""
        if os.path.exists(POLLS_FILE):
            with open(POLLS_FILE, 'r') as f:
                return json.load(f)
        return {}
    
    def save_polls(self):
        """Save active polls to file"""
        with open(POLLS_FILE, 'w') as f:
            json.dump(self.active_polls, f, indent=2)
    
    def load_previews(self):
        """Load poll previews from file"""
        if os.path.exists(PREVIEWS_FILE):
            with open(PREVIEWS_FILE, 'r') as f:
                return json.load(f)
        return {}
    
    def save_previews(self):
        """Save poll previews to file"""
        with open(PREVIEWS_FILE, 'w') as f:
            json.dump(self.poll_previews, f, indent=2)
    
    def load_sticky_notes(self):
        """Load sticky notes from file"""
        if os.path.exists(STICKY_NOTES_FILE):
            with open(STICKY_NOTES_FILE, 'r') as f:
                return json.load(f)
        return {}
    
    def save_sticky_notes(self):
        """Save sticky notes to file"""
        with open(STICKY_NOTES_FILE, 'w') as f:
            json.dump(self.sticky_notes, f, indent=2)
    
    async def on_ready(self):
        print(f'{self.user} has connected to Discord!')
        
        # Sync commands only to the specified guild
        guild = discord.Object(id=GUILD_ID)
        self.tree.copy_global_to(guild=guild)
        await self.tree.sync(guild=guild)
        print(f'Commands synced to guild {GUILD_ID}')
    
    async def on_message(self, message):
        """Handle new messages to check for sticky note updates"""
        if message.author.bot:
            return
        
        channel_id = str(message.channel.id)
        
        # Check if this channel has sticky notes
        if channel_id in self.sticky_notes:
            sticky_data = self.sticky_notes[channel_id]
            
            # Delete old sticky message if it exists
            try:
                if sticky_data.get('message_id'):
                    old_message = await message.channel.fetch_message(sticky_data['message_id'])
                    await old_message.delete()
            except:
                pass  # Message might already be deleted
            
            # Repost sticky note
            await self.repost_sticky_note(message.channel, sticky_data)
    
    def is_admin_or_allowed_role(self, interaction: discord.Interaction, command_name: str):
        """Check if user has admin permissions or allowed role for command"""
        # Check if user has administrator permissions
        if interaction.user.guild_permissions.administrator:
            return True
        
        # Check if command has enabled roles and user has one of them
        if command_name in self.role_config["enabled_roles"]:
            user_role_ids = [role.id for role in interaction.user.roles]
            allowed_role_ids = self.role_config["enabled_roles"][command_name]
            return any(role_id in allowed_role_ids for role_id in user_role_ids)
        
        return False

bot = PollBot()

# Custom check decorator for admin or allowed roles
def admin_or_allowed_role(command_name: str):
    def predicate(interaction: discord.Interaction):
        return bot.is_admin_or_allowed_role(interaction, command_name)
    return app_commands.check(predicate)

# Check to ensure commands only work in the specified guild
def guild_only():
    def predicate(interaction: discord.Interaction):
        return interaction.guild_id == GUILD_ID
    return app_commands.check(predicate)

def parse_color(color_str: str) -> int:
    """Parse color string and return hex color code"""
    color_str = color_str.lower().strip()
    
    # Common color mappings
    color_map = {
        "red": 0xff0000,
        "green": 0x00ff00,
        "blue": 0x0000ff,
        "yellow": 0xffff00,
        "purple": 0x800080,
        "pink": 0xffc0cb,
        "orange": 0xffa500,
        "cyan": 0x00ffff,
        "magenta": 0xff00ff,
        "lime": 0x00ff00,
        "navy": 0x000080,
        "teal": 0x008080,
        "silver": 0xc0c0c0,
        "gold": 0xffd700,
        "black": 0x000000,
        "white": 0xffffff,
        "gray": 0x808080,
        "grey": 0x808080,
        "brown": 0xa52a2a,
        "maroon": 0x800000,
        "olive": 0x808000,
        "aqua": 0x00ffff,
        "fuchsia": 0xff00ff,
        "violet": 0xee82ee,
        "indigo": 0x4b0082,
        "turquoise": 0x40e0d0,
        "coral": 0xff7f50,
        "salmon": 0xfa8072
    }
    
    # Check if it's a named color
    if color_str in color_map:
        return color_map[color_str]
    
    # Try to parse hex color
    if color_str.startswith('#'):
        color_str = color_str[1:]
    
    # Validate hex format
    if len(color_str) == 6 and all(c in '0123456789abcdef' for c in color_str):
        return int(color_str, 16)
    elif len(color_str) == 3 and all(c in '0123456789abcdef' for c in color_str):
        # Convert 3-digit hex to 6-digit
        return int(color_str[0]*2 + color_str[1]*2 + color_str[2]*2, 16)
    
    # Default to blue if parsing fails
    return 0x3498db

def parse_duration(duration_str: str) -> int:
    """Parse duration string and return seconds"""
    duration_str = duration_str.lower().strip()
    
    # Regular expression to match number and unit
    match = re.match(r'^(\d+)\s*(m|min|minute|minutes|h|hour|hours|d|day|days|w|week|weeks|mo|month|months)s?$', duration_str)
    
    if not match:
        raise ValueError("Invalid duration format. Use format like: 30m, 2h, 1d, 1w, 1mo")
    
    number = int(match.group(1))
    unit = match.group(2)
    
    # Convert to seconds
    if unit in ['m', 'min', 'minute', 'minutes']:
        return number * 60
    elif unit in ['h', 'hour', 'hours']:
        return number * 3600
    elif unit in ['d', 'day', 'days']:
        return number * 86400
    elif unit in ['w', 'week', 'weeks']:
        return number * 604800
    elif unit in ['mo', 'month', 'months']:
        return number * 2592000  # 30 days
    
    raise ValueError("Invalid duration unit")

@bot.tree.command(name="config", description="Configure role permissions for commands")
@app_commands.describe(
    action="enable or disable",
    command="Command name to configure",
    role="Role to enable/disable for the command"
)
@guild_only()
@app_commands.default_permissions(administrator=True)
async def config_command(interaction: discord.Interaction, action: str, command: str, role: discord.Role):
    """Configure which roles can use specific commands"""
    
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ You need Administrator permissions to use this command!", ephemeral=True)
        return
    
    action = action.lower()
    if action not in ["enable", "disable"]:
        await interaction.response.send_message("❌ Action must be 'enable' or 'disable'", ephemeral=True)
        return
    
    # Initialize command in config if it doesn't exist
    if command not in bot.role_config["enabled_roles"]:
        bot.role_config["enabled_roles"][command] = []
    
    if action == "enable":
        if role.id not in bot.role_config["enabled_roles"][command]:
            bot.role_config["enabled_roles"][command].append(role.id)
            bot.save_config()
            await interaction.response.send_message(f"✅ Enabled role **{role.name}** for command `{command}`", ephemeral=True)
        else:
            await interaction.response.send_message(f"⚠️ Role **{role.name}** is already enabled for command `{command}`", ephemeral=True)
    
    elif action == "disable":
        if role.id in bot.role_config["enabled_roles"][command]:
            bot.role_config["enabled_roles"][command].remove(role.id)
            bot.save_config()
            await interaction.response.send_message(f"✅ Disabled role **{role.name}** for command `{command}`", ephemeral=True)
        else:
            await interaction.response.send_message(f"⚠️ Role **{role.name}** is not enabled for command `{command}`", ephemeral=True)

@bot.tree.command(name="list_permissions", description="List current role permissions for commands")
@guild_only()
@app_commands.default_permissions(administrator=True)
async def list_permissions(interaction: discord.Interaction):
    """List current role permissions"""
    
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ You need Administrator permissions to use this command!", ephemeral=True)
        return
    
    embed = discord.Embed(title="📋 Command Role Permissions", color=0x00ff00)
    
    if not bot.role_config["enabled_roles"]:
        embed.description = "No role permissions configured yet."
    else:
        for command_name, role_ids in bot.role_config["enabled_roles"].items():
            if role_ids:
                role_mentions = []
                for role_id in role_ids:
                    role = interaction.guild.get_role(role_id)
                    if role:
                        role_mentions.append(role.mention)
                    else:
                        role_mentions.append(f"<@&{role_id}> (deleted)")
                
                embed.add_field(
                    name=f"Command: {command_name}",
                    value=", ".join(role_mentions) if role_mentions else "No roles",
                    inline=False
                )
    
    await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="pollcreate", description="Create a poll preview (use /pollstart to actually start it)")
@app_commands.describe(
    question="The poll question",
    duration="Poll duration (e.g., 30m, 2h, 1d, 1w, 1mo)",
    emotes="Voting emotes (space separated, e.g., :thumbsup: :thumbsdown:)",
    color="Embed color (hex code like #ff0000 or color name like red, blue, purple, etc.)"
)
@guild_only()
@admin_or_allowed_role("pollcreate")
async def create_poll(interaction: discord.Interaction, question: str, duration: str, emotes: str, color: str = "blue"):
    """Create a poll preview - use /pollstart to send it to a channel"""
    
    try:
        duration_seconds = parse_duration(duration)
    except ValueError as e:
        await interaction.response.send_message(f"❌ {str(e)}", ephemeral=True)
        return
    
    # Parse color
    embed_color = parse_color(color)
    
    # Parse emotes
    emote_list = emotes.split()
    if len(emote_list) < 2:
        await interaction.response.send_message("❌ You need at least 2 emotes for voting!", ephemeral=True)
        return
    
    if len(emote_list) > 30:
        await interaction.response.send_message("❌ Maximum 30 emotes allowed!", ephemeral=True)
        return
    
    # Show configuration modal
    modal = PollConfigModal(question, duration_seconds, emote_list, embed_color, is_preview=True)
    await interaction.response.send_modal(modal)

@bot.tree.command(name="pollstart", description="Start a poll from a preview in a specific channel")
@app_commands.describe(
    preview_id="The preview ID to start",
    channel="Channel to send the poll to (optional - uses current channel if not specified)"
)
@guild_only()
@admin_or_allowed_role("pollstart")
async def start_poll(interaction: discord.Interaction, preview_id: str, channel: Optional[discord.TextChannel] = None):
    """Start a poll from a preview"""
    
    if preview_id not in bot.poll_previews:
        await interaction.response.send_message("❌ Preview not found! Use `/pollcreate` to create a preview first.", ephemeral=True)
        return
    
    preview_data = bot.poll_previews[preview_id]
    target_channel = channel or interaction.channel
    
    # Create poll ID
    poll_id = str(interaction.id)
    
    # Convert preview to active poll
    end_time = datetime.now() + timedelta(seconds=preview_data['duration'])
    poll_data = {
        "question": preview_data['question'],
        "titles": preview_data['titles'],
        "image_urls": preview_data['image_urls'],
        "emotes": preview_data['emotes'],
        "multi_vote_config": preview_data['multi_vote_config'],
        "single_vote_roles": preview_data['single_vote_roles'],
        "blocked_roles": preview_data['blocked_roles'],
        "color": preview_data['color'],
        "end_time": end_time.isoformat(),
        "votes": {},
        "user_votes": {},
        "channel_id": target_channel.id,
        "creator_id": interaction.user.id
    }
    
    bot.active_polls[poll_id] = poll_data
    bot.save_polls()
    
    # Create and send poll
    view = AdvancedPollView(poll_id, poll_data)
    embed = create_poll_embed(poll_data, poll_id)
    
    await interaction.response.send_message(f"✅ Poll started in {target_channel.mention}!", ephemeral=True)
    
    # Send poll to target channel
    message = await target_channel.send(embed=embed, view=view)
    
    # Store message reference
    bot.active_polls[poll_id]["message_id"] = message.id
    bot.save_polls()

@bot.tree.command(name="polledit", description="Edit a poll preview")
@app_commands.describe(preview_id="The preview ID to edit")
@guild_only()
@admin_or_allowed_role("polledit")
async def edit_poll(interaction: discord.Interaction, preview_id: str):
    """Edit a poll preview"""
    
    if preview_id not in bot.poll_previews:
        await interaction.response.send_message("❌ Preview not found!", ephemeral=True)
        return
    
    preview_data = bot.poll_previews[preview_id]
    
    # Show edit modal with current data
    modal = PollEditModal(preview_id, preview_data)
    await interaction.response.send_modal(modal)

class PollConfigModal(discord.ui.Modal, title="Poll Configuration"):
    def __init__(self, question: str, duration: int, emotes: List[str], color: int, is_preview: bool = False):
        super().__init__()
        self.question = question
        self.duration = duration
        self.emotes = emotes
        self.color = color
        self.is_preview = is_preview
    
    image_titles = discord.ui.TextInput(
        label="Image Titles (one per line, 2-30 entries)",
        style=discord.TextStyle.long,
        placeholder="Option 1\nOption 2\n@username (for member submission)\netc...",
        required=True,
        max_length=2000
    )
    
    multi_vote_roles = discord.ui.TextInput(
        label="Multi-vote roles (format: @role:count, @role:count)",
        style=discord.TextStyle.long,
        placeholder="@VIP:3, @Moderator:5\n(Leave empty if none)",
        required=False,
        max_length=1000
    )
    
    single_vote_roles = discord.ui.TextInput(
        label="Single-vote roles (comma separated)",
        style=discord.TextStyle.long,
        placeholder="@Member, @Subscriber\n(Leave empty to allow everyone)",
        required=False,
        max_length=1000
    )
    
    blocked_roles = discord.ui.TextInput(
        label="Blocked roles (comma separated)",
        style=discord.TextStyle.long,
        placeholder="@Muted, @Restricted\n(Leave empty if none)",
        required=False,
        max_length=1000
    )
    
    async def on_submit(self, interaction: discord.Interaction):
        # Parse image titles
        titles = [title.strip() for title in self.image_titles.value.split('\n') if title.strip()]
        
        if len(titles) < 2 or len(titles) > 30:
            await interaction.response.send_message("❌ You need between 2-30 image titles!", ephemeral=True)
            return
        
        if len(titles) != len(self.emotes):
            await interaction.response.send_message(f"❌ Number of titles ({len(titles)}) must match number of emotes ({len(self.emotes)})!", ephemeral=True)
            return
        
        # Parse role configurations
        multi_vote_config = {}
        single_vote_roles = []
        blocked_roles = []
        
        if self.multi_vote_roles.value.strip():
            for role_config in self.multi_vote_roles.value.split(','):
                if ':' in role_config:
                    role_part, count_part = role_config.strip().split(':', 1)
                    role_id = self.extract_role_id(role_part.strip(), interaction.guild)
                    if role_id:
                        try:
                            count = int(count_part.strip())
                            multi_vote_config[str(role_id)] = count
                        except ValueError:
                            pass
        
        if self.single_vote_roles.value.strip():
            for role_mention in self.single_vote_roles.value.split(','):
                role_id = self.extract_role_id(role_mention.strip(), interaction.guild)
                if role_id:
                    single_vote_roles.append(role_id)
        
        if self.blocked_roles.value.strip():
            for role_mention in self.blocked_roles.value.split(','):
                role_id = self.extract_role_id(role_mention.strip(), interaction.guild)
                if role_id:
                    blocked_roles.append(role_id)
        
        if self.is_preview:
            # Show image upload modal for preview
            upload_modal = ImageUploadModal(
                self.question, self.duration, self.emotes, titles,
                multi_vote_config, single_vote_roles, blocked_roles, self.color, is_preview=True
            )
            await interaction.response.send_modal(upload_modal)
        else:
            # Direct poll creation (legacy)
            upload_modal = ImageUploadModal(
                self.question, self.duration, self.emotes, titles,
                multi_vote_config, single_vote_roles, blocked_roles, self.color, is_preview=False
            )
            await interaction.response.send_modal(upload_modal)
    
    def extract_role_id(self, role_mention: str, guild: discord.Guild) -> Optional[int]:
        """Extract role ID from mention or name"""
        # Try to extract from mention format <@&123456>
        match = re.match(r'<@&(\d+)>', role_mention)
        if match:
            return int(match.group(1))
        
        # If it starts with @, remove it and try to find role by name
        if role_mention.startswith('@'):
            role_mention = role_mention[1:]
        
        # Search for role by name
        for role in guild.roles:
            if role.name.lower() == role_mention.lower():
                return role.id
        
        return None

class PollEditModal(discord.ui.Modal, title="Edit Poll Preview"):
    def __init__(self, preview_id: str, preview_data: dict):
        super().__init__()
        self.preview_id = preview_id
        self.preview_data = preview_data
        
        # Pre-fill with current data
        self.question_field.default = preview_data['question']
        self.image_titles.default = '\n'.join(preview_data['titles'])
        self.image_urls.default = '\n'.join(preview_data['image_urls'])
    
    question_field = discord.ui.TextInput(
        label="Poll Question",
        style=discord.TextStyle.short,
        required=True,
        max_length=200
    )
    
    image_titles = discord.ui.TextInput(
        label="Image Titles (one per line)",
        style=discord.TextStyle.long,
        required=True,
        max_length=2000
    )
    
    image_urls = discord.ui.TextInput(
        label="Image URLs (one per line)",
        style=discord.TextStyle.long,
        required=True,
        max_length=2000
    )
    
    async def on_submit(self, interaction: discord.Interaction):
        # Parse new data
        titles = [title.strip() for title in self.image_titles.value.split('\n') if title.strip()]
        urls = [url.strip() for url in self.image_urls.value.split('\n') if url.strip()]
        
        if len(titles) != len(urls):
            await interaction.response.send_message("❌ Number of titles must match number of URLs!", ephemeral=True)
            return
        
        if len(titles) != len(self.preview_data['emotes']):
            await interaction.response.send_message(f"❌ Number of titles ({len(titles)}) must match number of emotes ({len(self.preview_data['emotes'])})!", ephemeral=True)
            return
        
        # Update preview data
        bot.poll_previews[self.preview_id]['question'] = self.question_field.value
        bot.poll_previews[self.preview_id]['titles'] = titles
        bot.poll_previews[self.preview_id]['image_urls'] = urls
        bot.save_previews()
        
        # Create updated preview embed
        embed = create_preview_embed(bot.poll_previews[self.preview_id], self.preview_id)
        
        await interaction.response.send_message("✅ Poll preview updated!", embed=embed, ephemeral=True)

class ImageUploadModal(discord.ui.Modal, title="Upload Images"):
    def __init__(self, question: str, duration: int, emotes: List[str], titles: List[str],
                 multi_vote_config: dict, single_vote_roles: List[int], blocked_roles: List[int], color: int, is_preview: bool = False):
        super().__init__()
        self.question = question
        self.duration = duration
        self.emotes = emotes
        self.titles = titles
        self.multi_vote_config = multi_vote_config
        self.single_vote_roles = single_vote_roles
        self.blocked_roles = blocked_roles
        self.color = color
        self.is_preview = is_preview
    
    image_urls = discord.ui.TextInput(
        label="Image URLs (one per line, must match title count)",
        style=discord.TextStyle.long,
        placeholder="https://example.com/image1.png\nhttps://example.com/image2.jpg\netc...",
        required=True,
        max_length=2000
    )
    
    async def on_submit(self, interaction: discord.Interaction):
        # Parse image URLs
        urls = [url.strip() for url in self.image_urls.value.split('\n') if url.strip()]
        
        if len(urls) != len(self.titles):
            await interaction.response.send_message(f"❌ Number of URLs ({len(urls)}) must match number of titles ({len(self.titles)})!", ephemeral=True)
            return
        
        # Validate URLs
        for url in urls:
            if not url.startswith(('http://', 'https://')):
                await interaction.response.send_message(f"❌ Invalid URL format: {url[:50]}...", ephemeral=True)
                return
        
        if self.is_preview:
            # Create preview
            preview_id = str(interaction.id)
            preview_data = {
                "question": self.question,
                "duration": self.duration,
                "titles": self.titles,
                "image_urls": urls,
                "emotes": self.emotes,
                "multi_vote_config": self.multi_vote_config,
                "single_vote_roles": self.single_vote_roles,
                "blocked_roles": self.blocked_roles,
                "color": self.color,
                "creator_id": interaction.user.id
            }
            
            bot.poll_previews[preview_id] = preview_data
            bot.save_previews()
            
            embed = create_preview_embed(preview_data, preview_id)
            await interaction.response.send_message(f"✅ Poll preview created! Use `/pollstart {preview_id}` to start it.", embed=embed, ephemeral=True)
        else:
            # Legacy direct poll creation
            poll_id = str(interaction.id)
            end_time = datetime.now() + timedelta(seconds=self.duration)
            poll_data = {
                "question": self.question,
                "titles": self.titles,
                "image_urls": urls,
                "emotes": self.emotes,
                "multi_vote_config": self.multi_vote_config,
                "single_vote_roles": self.single_vote_roles,
                "blocked_roles": self.blocked_roles,
                "color": self.color,
                "end_time": end_time.isoformat(),
                "votes": {},
                "user_votes": {},
                "creator_id": interaction.user.id
            }
            
            bot.active_polls[poll_id] = poll_data
            bot.save_polls()
            
            view = AdvancedPollView(poll_id, poll_data)
            embed = create_poll_embed(poll_data, poll_id)
            
            await interaction.response.send_message(embed=embed, view=view)
            
            message = await interaction.original_response()
            bot.active_polls[poll_id]["message_id"] = message.id
            bot.save_polls()

def create_preview_embed(preview_data: dict, preview_id: str) -> discord.Embed:
    """Create embed for poll preview"""
    embed = discord.Embed(
        title=f"📋 Poll Preview: {preview_data['question']}",
        description=f"Preview ID: `{preview_id}`\nDuration: {preview_data['duration']} seconds",
        color=preview_data.get('color', 0xffa500)
    )
    
    # Add options preview
    for i, (title, url) in enumerate(zip(preview_data['titles'], preview_data['image_urls'])):
        embed.add_field(
            name=f"{preview_data['emotes'][i]} {title}",
            value="Ready to vote",
            inline=True
        )
        
        if i == 0:
            embed.set_thumbnail(url=url)
    
    embed.set_footer(text="Use /pollstart to send this poll to a channel")
    return embed

def create_poll_embed(poll_data: dict, poll_id: str) -> discord.Embed:
    """Create embed for poll display"""
    embed = discord.Embed(
        title=f"📊 {poll_data['question']}",
        description="Vote by clicking the reactions below!",
        color=poll_data.get('color', 0x3498db)
    )
    
    # Add images and vote counts
    for i, (title, url) in enumerate(zip(poll_data['titles'], poll_data['image_urls'])):
        vote_count = poll_data['votes'].get(str(i), 0)
        embed.add_field(
            name=f"{poll_data['emotes'][i]} {title}",
            value=f"{vote_count} votes",
            inline=True
        )
        
        # Add first image as thumbnail
        if i == 0:
            embed.set_thumbnail(url=url)
    
    # Add voting rules info
    rules = []
    if poll_data['multi_vote_config']:
        rules.append("Some roles can vote multiple times")
    if poll_data['single_vote_roles']:
        rules.append("Some roles limited to single votes")
    if poll_data['blocked_roles']:
        rules.append("Some roles cannot vote")
    
    if rules:
        embed.add_field(name="Voting Rules", value="\n".join(rules), inline=False)
    
    end_time = datetime.fromisoformat(poll_data['end_time'])
    embed.set_footer(text=f"Poll ends: {end_time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    
    return embed

def get_poll_winners(poll_data: dict) -> List[int]:
    """Get the winning option(s) from poll data"""
    if not poll_data['votes']:
        return []
    
    max_votes = max(poll_data['votes'].values())
    winners = []
    
    for option_str, vote_count in poll_data['votes'].items():
        if vote_count == max_votes:
            winners.append(int(option_str))
    
    return winners

async def create_tiebreaker_poll(original_poll_data: dict, tied_options: List[int], interaction_or_channel):
    """Create a new poll for tiebreaker with only the tied options"""
    # Create new poll data with only tied options
    tied_titles = [original_poll_data['titles'][i] for i in tied_options]
    tied_urls = [original_poll_data['image_urls'][i] for i in tied_options]
    tied_emotes = [original_poll_data['emotes'][i] for i in tied_options]
    
    # Use same duration as original (or default to 1 hour)
    duration = 3600  # 1 hour default for tiebreaker
    
    poll_id = f"tiebreaker_{int(datetime.now().timestamp())}"
    end_time = datetime.now() + timedelta(seconds=duration)
    
    tiebreaker_data = {
        "question": f"TIEBREAKER: {original_poll_data['question']}",
        "titles": tied_titles,
        "image_urls": tied_urls,
        "emotes": tied_emotes,
        "multi_vote_config": original_poll_data['multi_vote_config'],
        "single_vote_roles": original_poll_data['single_vote_roles'],
        "blocked_roles": original_poll_data['blocked_roles'],
        "color": original_poll_data.get('color', 0x3498db),
        "end_time": end_time.isoformat(),
        "votes": {},
        "user_votes": {},
        "is_tiebreaker": True
    }
    
    bot.active_polls[poll_id] = tiebreaker_data
    bot.save_polls()
    
    # Create and send tiebreaker poll
    view = AdvancedPollView(poll_id, tiebreaker_data)
    embed = create_poll_embed(tiebreaker_data, poll_id)
    embed.title = "🔥 " + embed.title[2:]  # Replace 📊 with 🔥 for tiebreaker
    embed.color = 0xff6b6b  # Red color for tiebreaker
    
    if hasattr(interaction_or_channel, 'send'):
        # It's a channel
        message = await interaction_or_channel.send(embed=embed, view=view)
    else:
        # It's an interaction
        message = await interaction_or_channel.followup.send(embed=embed, view=view)
    
    bot.active_polls[poll_id]["message_id"] = message.id
    bot.save_polls()

class AdvancedPollView(discord.ui.View):
    def __init__(self, poll_id: str, poll_data: dict):
        # Calculate timeout
        end_time = datetime.fromisoformat(poll_data['end_time'])
        timeout_seconds = (end_time - datetime.now()).total_seconds()
        timeout_seconds = max(1, min(timeout_seconds, 2147483))  # Discord's max timeout
        
        super().__init__(timeout=timeout_seconds)
        self.poll_id = poll_id
        
        # Add reaction buttons
        for i, emote in enumerate(poll_data['emotes']):
            button = PollVoteButton(i, emote, poll_id)
            self.add_item(button)
    
    async def on_timeout(self):
        """Called when poll times out"""
        if self.poll_id not in bot.active_polls:
            return
            
        poll_data = bot.active_polls[self.poll_id]
        
        # Get winners
        winners = get_poll_winners(poll_data)
        
        # Disable all buttons
        for item in self.children:
            item.disabled = True
            
            # Create results embed
        embed = create_poll_embed(poll_data, self.poll_id)
        embed.title = "🔒 " + embed.title[2:]  # Replace 📊 with 🔒
        embed.color = 0x95a5a6  # Gray
        
        # Handle results
        if not winners:
            embed.description = "**No votes were cast! No winner.**"
            embed.set_footer(text="This poll has ended with no votes.")
        elif len(winners) == 1:
            winner_title = poll_data['titles'][winners[0]]
            embed.description = f"**🏆 Winner: {winner_title}**"
            embed.set_footer(text="This poll has ended.")
        else:
            # Multiple winners (tie)
            tied_titles = [poll_data['titles'][i] for i in winners]
            embed.description = f"**🤝 Tie between: {', '.join(tied_titles)}**"
            embed.set_footer(text="This poll ended in a tie. A tiebreaker poll will be created.")
        
        # Try to update message
        channel = None
        try:
            if "message_id" in poll_data and "channel_id" in poll_data:
                channel = bot.get_channel(poll_data["channel_id"])
                if channel:
                    message = await channel.fetch_message(poll_data["message_id"])
                    await message.edit(embed=embed, view=self)
            elif "message_id" in poll_data:
                # Fallback: search all channels in guild
                guild = bot.get_guild(GUILD_ID)
                if guild:
                    for ch in guild.text_channels:
                        try:
                            message = await ch.fetch_message(poll_data["message_id"])
                            await message.edit(embed=embed, view=self)
                            channel = ch
                            break
                        except:
                            continue
        except Exception as e:
            print(f"Error updating poll message: {e}")
        
        # Create tiebreaker if needed
        if len(winners) > 1 and channel:
            await asyncio.sleep(2)  # Brief delay before creating tiebreaker
            await create_tiebreaker_poll(poll_data, winners, channel)
        
        # Clean up poll data
        del bot.active_polls[self.poll_id]
        bot.save_polls()

class PollVoteButton(discord.ui.Button):
    def __init__(self, option_index: int, emote: str, poll_id: str):
        # Try to use custom emote, fallback to label
        emoji = None
        label = None
        
        # Check if it's a custom emote (<:name:id> or <a:name:id>)
        if emote.startswith('<') and emote.endswith('>'):
            emoji = emote
        # Check if it's a unicode emoji
        elif len(emote) <= 2:
            emoji = emote
        else:
            # Use as label if not a valid emoji
            label = emote[:80]  # Discord button label limit
        
        super().__init__(style=discord.ButtonStyle.primary, emoji=emoji, label=label)
        self.option_index = option_index
        self.poll_id = poll_id
    
    async def callback(self, interaction: discord.Interaction):
        if self.poll_id not in bot.active_polls:
            await interaction.response.send_message("❌ This poll is no longer active!", ephemeral=True)
            return
        
        poll_data = bot.active_polls[self.poll_id]
        user_id = str(interaction.user.id)
        
        # Check if user is blocked
        user_role_ids = [role.id for role in interaction.user.roles]
        if any(role_id in poll_data['blocked_roles'] for role_id in user_role_ids):
            await interaction.response.send_message("❌ You are not allowed to vote in this poll!", ephemeral=True)
            return
        
        # Check voting limits
        user_votes = poll_data['user_votes'].get(user_id, [])
        max_votes = 1  # Default
        
        # Check if user has multi-vote role
        for role_id in user_role_ids:
            if str(role_id) in poll_data['multi_vote_config']:
                max_votes = poll_data['multi_vote_config'][str(role_id)]
                break
        
        # Check if already at vote limit
        if len(user_votes) >= max_votes:
            await interaction.response.send_message(f"❌ You have reached your vote limit ({max_votes} votes)!", ephemeral=True)
            return
        
        # Check if already voted for this option
        if self.option_index in user_votes:
            await interaction.response.send_message("❌ You have already voted for this option!", ephemeral=True)
            return
        
        # Add vote
        option_key = str(self.option_index)
        if option_key not in poll_data['votes']:
            poll_data['votes'][option_key] = 0
        poll_data['votes'][option_key] += 1
        
        # Track user vote
        if user_id not in poll_data['user_votes']:
            poll_data['user_votes'][user_id] = []
        poll_data['user_votes'][user_id].append(self.option_index)
        
        # Save data
        bot.active_polls[self.poll_id] = poll_data
        bot.save_polls()
        
        # Update embed
        embed = create_poll_embed(poll_data, self.poll_id)
        await interaction.response.edit_message(embed=embed, view=self.view)

# Error handler for permission checks
@bot.tree.error
async def on_app_command_error(interaction: discord.Interaction, error: app_commands.AppCommandError):
    if isinstance(error, app_commands.CheckFailure):
        await interaction.response.send_message("❌ You don't have permission to use this command!", ephemeral=True)
    else:
        print(f"Error: {error}")
        if not interaction.response.is_done():
            await interaction.response.send_message("❌ An error occurred while processing the command.", ephemeral=True)

@bot.tree.command(name="sticky", description="Create a sticky note that stays at the bottom of the channel")
@app_commands.describe(
    message_type="Choose between embed or regular message",
    title="Title for the sticky note (only for embed)",
    content="Content of the sticky note",
    color="Color for embed (hex code or color name, only for embed)"
)
@app_commands.choices(message_type=[
    app_commands.Choice(name="Embed", value="embed"),
    app_commands.Choice(name="Regular Message", value="message")
])
@guild_only()
@admin_or_allowed_role("sticky")
async def create_sticky(interaction: discord.Interaction, message_type: str, content: str, 
                       title: Optional[str] = None, color: Optional[str] = "blue"):
    """Create a sticky note in the current channel"""
    
    channel_id = str(interaction.channel.id)
    
    # Delete existing sticky note if any
    if channel_id in bot.sticky_notes:
        try:
            old_message_id = bot.sticky_notes[channel_id].get('message_id')
            if old_message_id:
                old_message = await interaction.channel.fetch_message(old_message_id)
                await old_message.delete()
        except:
            pass
    
    # Create sticky note data
    sticky_data = {
        "type": message_type,
        "content": content,
        "title": title,
        "color": parse_color(color) if message_type == "embed" else None,
        "creator_id": interaction.user.id,
        "channel_id": interaction.channel.id
    }
    
    # Send initial sticky note
    await interaction.response.send_message("✅ Creating sticky note...", ephemeral=True)
    message_id = await bot.repost_sticky_note(interaction.channel, sticky_data)
    
    # Store sticky note data
    sticky_data["message_id"] = message_id
    bot.sticky_notes[channel_id] = sticky_data
    bot.save_sticky_notes()

@bot.tree.command(name="unsticky", description="Remove the sticky note from current channel")
@guild_only()
@admin_or_allowed_role("unsticky")
async def remove_sticky(interaction: discord.Interaction):
    """Remove sticky note from current channel"""
    
    channel_id = str(interaction.channel.id)
    
    if channel_id not in bot.sticky_notes:
        await interaction.response.send_message("❌ No sticky note found in this channel!", ephemeral=True)
        return
    
    # Check if user is creator or admin
    sticky_data = bot.sticky_notes[channel_id]
    if (sticky_data["creator_id"] != interaction.user.id and 
        not interaction.user.guild_permissions.administrator):
        await interaction.response.send_message("❌ You can only remove sticky notes you created!", ephemeral=True)
        return
    
    # Delete sticky message
    try:
        message_id = sticky_data.get('message_id')
        if message_id:
            message = await interaction.channel.fetch_message(message_id)
            await message.delete()
    except:
        pass
    
    # Remove from storage
    del bot.sticky_notes[channel_id]
    bot.save_sticky_notes()
    
    await interaction.response.send_message("✅ Sticky note removed!", ephemeral=True)

@bot.tree.command(name="liststicky", description="List all sticky notes in the server")
@guild_only()
@admin_or_allowed_role("liststicky")
async def list_sticky(interaction: discord.Interaction):
    """List all active sticky notes in the server"""
    
    if not bot.sticky_notes:
        await interaction.response.send_message("❌ No sticky notes found in this server!", ephemeral=True)
        return
    
    embed = discord.Embed(title="📝 Active Sticky Notes", color=0x00ff00)
    
    for channel_id, sticky_data in bot.sticky_notes.items():
        channel = bot.get_channel(int(channel_id))
        if channel and channel.guild.id == GUILD_ID:
            creator = bot.get_user(sticky_data["creator_id"])
            creator_name = creator.display_name if creator else "Unknown User"
            
            content_preview = sticky_data["content"][:100]
            if len(sticky_data["content"]) > 100:
                content_preview += "..."
            
            embed.add_field(
                name=f"#{channel.name}",
                value=f"**Type:** {sticky_data['type'].title()}\n"
                      f"**Creator:** {creator_name}\n"
                      f"**Content:** {content_preview}",
                inline=False
            )
    
    if not embed.fields:
        embed.description = "No sticky notes found in this server."
    
    await interaction.response.send_message(embed=embed, ephemeral=True)

async def repost_sticky_note(channel, sticky_data):
    """Repost a sticky note and return the new message ID"""
    if sticky_data["type"] == "embed":
        embed = discord.Embed(
            title=sticky_data.get("title", "Sticky Note"),
            description=sticky_data["content"],
            color=sticky_data.get("color", 0x3498db)
        )
        embed.set_footer(text="📌 This is a sticky note")
        message = await channel.send(embed=embed)
    else:
        content = f"📌 **STICKY NOTE**\n{sticky_data['content']}"
        message = await channel.send(content)
    
    return message.id

# Add the repost method to the bot class
bot.repost_sticky_note = repost_sticky_note

# Run the bot
if __name__ == "__main__":
    # You'll need to add your bot token as a secret
    bot.run(os.getenv('DISCORD_BOT_TOKEN'))
