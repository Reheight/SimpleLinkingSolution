using Facepunch;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Oxide.Core;
using Oxide.Core.Libraries.Covalence;
using Oxide.Core.Plugins;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Oxide.Plugins
{
    [Info("SimpleLinkingSolution", "Reheight", "1.1.3")]
    [Description("Allows you to track the linking of players to your services!")]
    class SimpleLinkingSolution : CovalencePlugin
    {
        private PluginConfig _config;
        private Dictionary<string, LinkPlayer> _links = new Dictionary<string, LinkPlayer>();
        private Queue<IPlayer> _queue = new Queue<IPlayer>();
        private LinkWebData lwd = null;
        private Dictionary<string, DateTime> _clearcacheCooldown = new Dictionary<string, DateTime>();

        [PluginReference]
        private Plugin Notify;

        protected override void LoadDefaultConfig() => _config = GetDefaultConfig();

        protected override void LoadConfig()
        {
            base.LoadConfig();

            try
            {
                _config = Config.ReadObject<PluginConfig>();

                if (_config == null)
                {
                    throw new JsonException();
                }

                if (!_config.ToDictionary().Keys.SequenceEqual(Config.ToDictionary(x => x.Key, x => x.Value).Keys))
                {
                    PrintWarning($"PluginConfig file {Name}.json updated.");

                    SaveConfig();
                }
            }
            catch
            {
                LoadDefaultConfig();

                PrintError("Config file contains an error and has been replaced with the default file.");
            }

        }

        private void Loaded()
        {
            timer.Every(_config.QueueTimer, HandleQueue);
            timer.Every(_config.UpdateTimer, () =>
            {
                foreach (var player in players.Connected)
                {
                    if (_queue.Contains(player)) continue;
                    else _queue.Enqueue(player);
                }
            });
        }

        private void Unload()
        {
            SaveData();
        }

        private void HandleQueue()
        {
            if (_queue.Count < 1) return;

            var NumberProcessed = _queue.Count < _config.PlayersPerQueue ? _queue.Count() : Math.Ceiling(_queue.Count() / Convert.ToDouble(_config.PlayersPerQueue));

            var users = _queue.DequeueChunk(Convert.ToInt32(NumberProcessed));

            foreach (var user in users)
            {
                NextTick(() =>
                {
                    APIRequest(CallType.Fetch, user);
                });
            }
        }

        protected override void SaveConfig() => Config.WriteObject(_config, true);

        private class PluginConfig
        {
            [JsonProperty(PropertyName = "Prefix", Order = 0)]
            public string Prefix { get; set; }

            [JsonProperty(PropertyName = "API URI", Order = 1)]
            public string APIURI { get; set; }

            [JsonProperty(PropertyName = "API PORT", Order = 2)]
            public int APIPORT { get; set; }

            [JsonProperty(PropertyName = "Linking URL", Order = 3)]
            public string LinkingURL { get; set; }

            [JsonProperty(PropertyName = "API Key", Order = 4)]
            public string APIKey { get; set; }

            [JsonProperty(PropertyName = "Authentication Commands", Order = 5)]
            public string[] AuthenticationCommands { get; set; }

            [JsonProperty(PropertyName = "Unlink Commands", Order = 6)]
            public string[] UnlinkCommands { get; set; }

            [JsonProperty(PropertyName = "Unlink Permission", Order = 7)]
            public string UnlinkPermission { get; set; }

            [JsonProperty(PropertyName = "Discord Linked Oxide Group", Order = 8)]
            public string DiscordLinkedOxideGroup { get; set; }

            [JsonProperty(PropertyName = "Discord Server Joined Oxide Group", Order = 9)]
            public string DiscordServerJoinedOxideGroup { get; set; }

            [JsonProperty(PropertyName = "Discord Boosted Oxide Group", Order = 10)]
            public string DiscordBoostedOxideGroup { get; set; }

            [JsonProperty(PropertyName = "Steam Linked Oxide Group", Order = 11)]
            public string SteamLinkedOxideGroup { get; set; }

            [JsonProperty(PropertyName = "Steam Group Joined Oxide Group", Order = 12)]
            public string SteamGroupOxideGroup { get; set; }

            [JsonProperty(PropertyName = "Save Interval", Order = 13)]
            public int SaveInterval { get; set; }

            [JsonProperty(PropertyName = "Update Timer", Order = 14)]
            public float UpdateTimer { get; set; }

            [JsonProperty(PropertyName = "Queue timer", Order = 15)]
            public float QueueTimer { get; set; }

            [JsonProperty(PropertyName = "Players Per Queue", Order = 16)]
            public int PlayersPerQueue { get; set; }

            [JsonProperty(PropertyName = "Mevent Notify", Order = 17)]
            public bool MeventNotify { get; set; }

            [JsonProperty(PropertyName = "Mevent Nofity Type", Order = 18)]
            public int MeventNotifyType { get; set; }

            [JsonProperty(PropertyName = "Clear Cache Cooldown", Order = 19)]
            public double ClearCacheCooldown { get; set; }

            public string ToJson() => JsonConvert.SerializeObject(this);

            public Dictionary<string, object> ToDictionary() => JsonConvert.DeserializeObject<Dictionary<string, object>>(ToJson());
        }

        private PluginConfig GetDefaultConfig()
        {
            return new PluginConfig
            {
                Prefix = "<color=#42f566>Simple Linking:</color> ",
                APIURI = "http://localhost",
                APIPORT = 81,
                LinkingURL = "http://localhost/linking",
                APIKey = "SuperSecretPassword",
                AuthenticationCommands = new string[] {
                    "link",
                    "auth",
                    "authenticate"
                },
                UnlinkCommands = new string[] {
                    "unlink",
                    "removelink",
                    "deletelink",
                    "unauth"
                },
                UnlinkPermission = "simplelinkingsolution.unlink",
                DiscordLinkedOxideGroup = "discordlinked",
                DiscordServerJoinedOxideGroup = "discordjoined",
                DiscordBoostedOxideGroup = "discordboostedgroup",
                SteamLinkedOxideGroup = "steamlinked",
                SteamGroupOxideGroup = "steamgroup",
                SaveInterval = 600,
                UpdateTimer = 2.5f,
                QueueTimer = 15f,
                PlayersPerQueue = 15,
                MeventNotify = true,
                MeventNotifyType = 0,
                ClearCacheCooldown = 300
            };
        }

        protected override void LoadDefaultMessages()
        {
            lang.RegisterMessages(new Dictionary<string, string>
            {
                ["TrueColor"] = "#2cfc03",
                ["FalseColor"] = "#fa3e54",
                ["LinkingInformation"] = "<size=12><color=#b6bab7>Your can link your account by visiting <color=#61ff7e>{0}</color>!</size>",
                ["LinkingInformation1"] = "<size=12><color=#b6bab7>   - Steam Linked: {0}</color></size>",
                ["LinkingInformation2"] = "<size=12><color=#b6bab7>   - Steam Group Joined: {0}</color></size>",
                ["LinkingInformation3"] = "<size=12><color=#b6bab7>   - Discord Linked: {0}</color></size>",
                ["LinkingInformation4"] = "<size=12><color=#b6bab7>   - Discord Server Joined: {0}</color></size>",
                ["LinkingInformation5"] = "<size=12><color=#b6bab7>   - Discord Boosted: {0}</color></size>",
                ["LinkingInformation6"] = "<size=10><color=#b6bab7>Your linking status will be refreshed around every ~{0} minute(s).</color></size>",
                ["NoPermission"] = "<size=12><color=#b6bab7>You do not have permission to do this!</color></size>",
                ["UnlinkSyntax"] = "<size=12><color=#b6bab7>/{0} <Steam ID></color></size>",
                ["UnlinkSuccessful"] = "<size=12><color=#b6bab7>You have unlinked the account using the Steam ID provided!</color></size>",
                ["InvalidSteamID"] = "<size=12><color=#b6bab7>You have provided and invalid Steam ID!</color></size>",
                ["LinkUpdateNotification"] = "<size=12><color=#b6bab7>Your linking status has been updated!</color></size>",
                ["NoLinkingStatus"] = "<size=12><color=#b6bab7>It appears that we haven't yet checked your linking status, wait up to <color=#61ff7e>{0}</color> minute(s) and try again!</color></size>",
                ["MeventNotifyLinkingStatusUpdate"] = "Your linking status has been updated/changed.",
                ["LinkingStatusCacheClear"] = "<size=12><color=#b6bab7>Your linking status cache has been cleared, keep in mind you still need to wait for this to be updated again, you can see the wait time at the bottom of the message shown when typing /link!</color></size>",
                ["Cooldown"] = "<size=12><color=#b6bab7>You are doing this command too quickly between runs, you should try to be patient and wait in between each use!</color></size>"
            }, this);
        }

        private string Lang(string key, string pid, params object[] args) => _config.Prefix + String.Format(lang.GetMessage(key, this, pid), args);
        private string LangNoPFX(string key, string pid, params object[] args) => String.Format(lang.GetMessage(key, this, pid), args);

        // Data Handling

        private void TimedSaveData()
        {
            timer.In(_config.SaveInterval, () =>
            {
                FetchCurrentConfiguration();
                SaveData();

                TimedSaveData();
            });
        }

        private void FetchCurrentConfiguration()
        {
            APIRequest(CallType.Options, null);
        }

        private void LoadData()
        {
            _links.Clear();

            var data = Interface.Oxide.DataFileSystem.GetDatafile("SimpleLinkingSolution");

            if (data["links"] != null)
            {
                var linksData = (Dictionary<string, object>)Convert.ChangeType(data["links"], typeof(Dictionary<string, object>));

                foreach (var ilink in linksData)
                {
                    string tag = ilink.Key;
                    var linkData = ilink.Value as Dictionary<string, object>;

                    bool Exists = (bool)linkData["Exists"];
                    string SteamID = (string)linkData["SteamID"];
                    string DiscordID = (string)linkData["DiscordID"];
                    bool IsInDiscord = (bool)linkData["IsInDiscord"];
                    bool IsInSteamGroup = (bool)linkData["IsInSteamGroup"];
                    bool IsBoostingDiscordServer = (bool)linkData["IsBoostingDiscordServer"];

                    LinkPlayer linkPlayer;
                    _links.Add(tag, linkPlayer = new LinkPlayer()
                    {
                        Exists = Exists,
                        SteamID = SteamID,
                        DiscordID = DiscordID,
                        IsInDiscord = IsInDiscord,
                        IsInSteamGroup = IsInSteamGroup,
                        IsBoostingDiscordServer = IsBoostingDiscordServer
                    });
                }
            }
        }

        private void SaveData()
        {
            var data = Interface.Oxide.DataFileSystem.GetDatafile("SimpleLinkingSolution");

            var linksData = new Dictionary<string, object>();

            foreach (var link in _links)
            {
                var linkData = new Dictionary<string, object>();

                linkData.Add("Exists", link.Value.Exists);
                linkData.Add("SteamID", link.Value.SteamID);
                linkData.Add("DiscordID", link.Value.DiscordID);
                linkData.Add("IsInDiscord", link.Value.IsInDiscord);
                linkData.Add("IsInSteamGroup", link.Value.IsInSteamGroup);
                linkData.Add("IsBoostingDiscordServer", link.Value.IsBoostingDiscordServer);

                linksData.Add(link.Key, linkData);
            }

            data["links"] = linksData;
            Interface.Oxide.DataFileSystem.SaveDatafile("SimpleLinkingSolution");
        }

        // Actual Code For Service

        private void Init()
        {
            permission.RegisterPermission(_config.UnlinkPermission, this);

            AddCovalenceCommand(_config.AuthenticationCommands, nameof(LinkCommand));
            AddCovalenceCommand(_config.UnlinkCommands, nameof(UnlinkCommand));

            foreach (string group in new string[] { _config.SteamLinkedOxideGroup, _config.SteamGroupOxideGroup, _config.DiscordLinkedOxideGroup, _config.DiscordServerJoinedOxideGroup, _config.DiscordBoostedOxideGroup })
            {
                if (string.IsNullOrEmpty(group)) continue;

                permission.CreateGroup(group, group, 0);
            }

            FetchCurrentConfiguration();
            LoadData();
            TimedSaveData();
        }

        private enum CallType
        {
            Fetch,
            Unlink,
            Options
        }

        private enum RoleAdjustmentType
        {
            Remove,
            Add
        }

        private enum RoleAdjusted
        {
            DiscordLinked,
            DiscordServerJoined,
            DiscordServerBoosted,
            SteamLinked,
            SteamGroupJoined
        }

        private void APIRequest(CallType type, IPlayer player)
        {
            switch (type)
            {
                case CallType.Fetch:
                    webrequest.Enqueue($"{_config.APIURI}:{_config.APIPORT}/api/fetch/steam/{player.Id}", string.Empty, (code, resp) => { CheckLinkingStatus(code, resp, player); }, this);
                    break;

                case CallType.Unlink:
                    webrequest.Enqueue($"{_config.APIURI}:{_config.APIPORT}/api/authentication/steam/unlink/{player.Id}/{_config.APIKey}", string.Empty, (code, resp) => { CheckUnlinkStatus(code, resp, player); }, this);
                    break;

                case CallType.Options:
                    webrequest.Enqueue($"{_config.APIURI}:{_config.APIPORT}/api/fetch/options", string.Empty, (code, resp) => { CheckOptions(code, resp); }, this);
                    break;

                default:
                    Puts("SimpleLinkingSolution: There was an issue whilst trying to perform a API request!\n\nInvalid request type!");
                    break;
            }
        }

        private void CheckOptions(int respCode, string response)
        {
            if (respCode != 200 || string.IsNullOrEmpty(response))
            {
                Puts($"SimpleLinkingSolution: There was an error whilst checking the options for the linking status!\n\n{response}");
                return;
            }

            JObject jObject = JObject.Parse(response);

            LinkWebData lPlayer = new LinkWebData()
            {
                SteamGroup = (bool)jObject["CheckSteamGroup"],
                DiscordServer = (bool)jObject["CheckDiscordServer"]
            };

            lwd = lPlayer;
        }

        private void CheckLinkingStatus(int respCode, string response, IPlayer player)
        {
            if (respCode != 200 || string.IsNullOrEmpty(response))
            {
                Puts($"SimpleLinkingSolution: There was an error whilst checking the players linking status!\n\n{response}\n");
                return;
            }

            LinkPlayer lPlayer;

            if (!_links.TryGetValue(player.Id, out lPlayer))
            {
                lPlayer = LinkPlayer.Create(response, null);
            }

            LinkPlayer newStatus = LinkPlayer.Create(response, lPlayer);

            if (!_links.ContainsKey(player.Id))
                _links.Add(player.Id, lPlayer);
            else
            {
                if (!LinkPlayerIdentical(_links[player.Id], newStatus))
                {
                    if (_config.MeventNotify && Notify)
                    {
                        server.Command($"notify.player {player.Id} {_config.MeventNotifyType} \"{LangNoPFX("MeventNotifyLinkingStatusUpdate", player.Id)}\" ");
                    }
                    else
                    {
                        player.Reply(Lang("LinkUpdateNotification", player.Id));
                    }

                    _links[player.Id] = newStatus;
                }
            }

            ProcessRoles(player);
        }

        private bool LinkPlayerIdentical(LinkPlayer linkP1, LinkPlayer linkP2)
        {
            if (linkP1.DiscordID != linkP2.DiscordID ||
                linkP1.Exists != linkP2.Exists ||
                linkP1.IsBoostingDiscordServer != linkP2.IsBoostingDiscordServer ||
                linkP1.SteamID != linkP2.SteamID ||
                linkP1.IsInSteamGroup != linkP2.IsInSteamGroup) return false;
            else
                return true;
        }

        private void CheckUnlinkStatus(int respCode, string response, IPlayer player)
        {
            if (respCode != 200 || string.IsNullOrEmpty(response))
            {
                Puts($"SimpleLinkingSolution: There was an error whilst unlinking the player!\n\n{response}");
                return;
            }

            player.Reply(Lang("UnlinkSuccessful", player.Id));
        }

        private void ClearLinkingStatusCache(IPlayer player)
        {
            LinkPlayer lPlayer;

            if (!_links.TryGetValue(player.Id, out lPlayer))
            {
                lPlayer = new LinkPlayer()
                {
                    DiscordID = null,
                    SteamID = null,
                    IsBoostingDiscordServer = false,
                    IsInDiscord = false,
                    IsInSteamGroup = false
                };
            }

            lPlayer = new LinkPlayer()
            {
                DiscordID = null,
                SteamID = null,
                IsBoostingDiscordServer = false,
                IsInDiscord = false,
                IsInSteamGroup = false
            };

            if (!_links.ContainsKey(player.Id))
                _links.Add(player.Id, lPlayer);
            else
            {
                player.Reply(Lang("LinkingStatusCacheClear", player.Id));

                _links[player.Id] = lPlayer;
            }

            ProcessRoles(player);
        }

        private void LinkCommand(IPlayer player, string command, string[] args)
        {
            if (args.Length <= 0)
                SendLinkingStatus(player);
            else
            {
                switch (args[0])
                {
                    case "clearcache":
                        DateTime __currentTime = DateTime.Now;

                        DateTime __lastUsage;
                        if (!_clearcacheCooldown.TryGetValue(player.Id, out __lastUsage))
                        {
                            ClearLinkingStatusCache(player);

                            _clearcacheCooldown.Add(player.Id, __currentTime);
                            return;
                        }
                        else
                        {
                            double __usageInterval = (__currentTime - __lastUsage).TotalSeconds;

                            if (__usageInterval < _config.ClearCacheCooldown)
                            {
                                player.Reply(Lang("Cooldown", player.Id));
                                return;
                            }

                            ClearLinkingStatusCache(player);
                            _clearcacheCooldown[player.Id] = __currentTime;
                        }

                        break;
                    default:
                        SendLinkingStatus(player);
                        break;
                }
            }

        }

        private void UnlinkCommand(IPlayer player, string command, string[] args)
        {
            if (!IsAdministrator(player))
            {
                player.Reply(Lang("NoPermission", player.Id));
                return;
            }

            if (args.Length != 1)
            {
                player.Reply(Lang("UnlinkSyntax", player.Id, command));
                return;
            }

            long _ignore;
            if (args[0].Length != 17 || !long.TryParse(args[0], out _ignore))
            {
                player.Reply(Lang("InvalidSteamID", player.Id));
                return;
            }

            APIRequest(CallType.Unlink, player);
        }

        public bool IsAdministrator(IPlayer player)
        {
            bool status = false;

            if (player.IsAdmin) status = true;

            if (permission.UserHasPermission(player.Id, _config.UnlinkPermission)) status = true;

            return status;
        }

        private void SendLinkingStatus(IPlayer player)
        {
            LinkPlayer lPlayer;

            float offset = (players.Connected.Count() / _config.PlayersPerQueue * _config.QueueTimer) / 60;

            if (!_links.TryGetValue(player.Id, out lPlayer))
            {
                List<string> responseERR = Pool.GetList<string>();

                responseERR.Add(Lang("LinkingInformation", player.Id, _config.LinkingURL));

                responseERR.Add(LangNoPFX("NoLinkingStatus", player.Id, Math.Round(offset, MidpointRounding.AwayFromZero)));

                player.Reply(String.Join("\n", responseERR));

                Pool.FreeList(ref responseERR);
                return;
            }

            string LinkedTrue = $"<color={LangNoPFX("TrueColor", player.Id)}>True</color>";
            string LinkedFalse = $"<color={LangNoPFX("FalseColor", player.Id)}>False</color>";

            List<string> response = Pool.GetList<string>();

            response.Add(Lang("LinkingInformation", player.Id, _config.LinkingURL));
            response.Add(LangNoPFX("LinkingInformation1", player.Id, lPlayer.Exists ? LinkedTrue : LinkedFalse));

            if (lwd.SteamGroup)
            {
                response.Add(LangNoPFX("LinkingInformation2", player.Id, lPlayer.IsInSteamGroup ? LinkedTrue : LinkedFalse));
            }

            response.Add(LangNoPFX("LinkingInformation3", player.Id, (lPlayer.DiscordID != null && lPlayer.DiscordID.Length == 18) ? LinkedTrue : LinkedFalse));

            if (lwd.DiscordServer)
            {
                response.Add(LangNoPFX("LinkingInformation4", player.Id, lPlayer.IsInDiscord ? LinkedTrue : LinkedFalse));
                response.Add(LangNoPFX("LinkingInformation5", player.Id, lPlayer.IsBoostingDiscordServer ? LinkedTrue : LinkedFalse));
            }

            response.Add(LangNoPFX("LinkingInformation6", player.Id, Math.Round(offset, MidpointRounding.AwayFromZero)));

            player.Reply(String.Join("\n", response));
            Pool.FreeList(ref response);
        }

        private void ProcessRoles(IPlayer player)
        {
            LinkPlayer lPlayer;

            if (!_links.TryGetValue(player.Id, out lPlayer))
            {
                return;
            }


            if (lPlayer.Exists)
            {
                UpdateRole(player, RoleAdjustmentType.Add, RoleAdjusted.SteamLinked);
            }
            else
            {
                UpdateRole(player, RoleAdjustmentType.Remove, RoleAdjusted.SteamLinked);
                UpdateRole(player, RoleAdjustmentType.Remove, RoleAdjusted.SteamGroupJoined);
                UpdateRole(player, RoleAdjustmentType.Remove, RoleAdjusted.DiscordLinked);
                UpdateRole(player, RoleAdjustmentType.Remove, RoleAdjusted.DiscordServerJoined);
                UpdateRole(player, RoleAdjustmentType.Remove, RoleAdjusted.DiscordServerBoosted);

                return;
            }

            if (lPlayer.IsInSteamGroup && lwd.SteamGroup)
            {
                UpdateRole(player, RoleAdjustmentType.Add, RoleAdjusted.SteamGroupJoined);
            }
            else
            {
                UpdateRole(player, RoleAdjustmentType.Remove, RoleAdjusted.SteamGroupJoined);
            }

            if (lPlayer.DiscordID != null && lPlayer.DiscordID.Length == 18)
            {
                UpdateRole(player, RoleAdjustmentType.Add, RoleAdjusted.DiscordLinked);
            }
            else
            {
                UpdateRole(player, RoleAdjustmentType.Remove, RoleAdjusted.DiscordLinked);
            }

            if (lPlayer.IsInDiscord && lwd.DiscordServer)
            {
                UpdateRole(player, RoleAdjustmentType.Add, RoleAdjusted.DiscordServerJoined);
            }
            else
            {
                UpdateRole(player, RoleAdjustmentType.Remove, RoleAdjusted.DiscordServerJoined);
            }

            if (lPlayer.IsBoostingDiscordServer && lwd.DiscordServer)
            {
                UpdateRole(player, RoleAdjustmentType.Add, RoleAdjusted.DiscordServerBoosted);
            }
            else
            {
                UpdateRole(player, RoleAdjustmentType.Remove, RoleAdjusted.DiscordServerBoosted);
            }
        }

        private void UpdateRole(IPlayer player, RoleAdjustmentType type, RoleAdjusted roleAdjusted)
        {
            switch (roleAdjusted)
            {
                case RoleAdjusted.SteamLinked:
                    if (_config.SteamLinkedOxideGroup == "" || _config.SteamLinkedOxideGroup == null) return;

                    if (type == RoleAdjustmentType.Add)
                        permission.AddUserGroup(player.Id, _config.SteamLinkedOxideGroup);
                    else
                        permission.RemoveUserGroup(player.Id, _config.SteamLinkedOxideGroup);
                    break;
                case RoleAdjusted.SteamGroupJoined:
                    if (_config.SteamGroupOxideGroup == "" || _config.SteamGroupOxideGroup == null) return;

                    if (type == RoleAdjustmentType.Add)
                        permission.AddUserGroup(player.Id, _config.SteamGroupOxideGroup);
                    else
                        permission.RemoveUserGroup(player.Id, _config.SteamGroupOxideGroup);
                    break;
                case RoleAdjusted.DiscordLinked:
                    if (_config.DiscordLinkedOxideGroup == "" || _config.DiscordLinkedOxideGroup == null) return;

                    if (type == RoleAdjustmentType.Add)
                        permission.AddUserGroup(player.Id, _config.DiscordLinkedOxideGroup);
                    else
                        permission.RemoveUserGroup(player.Id, _config.DiscordLinkedOxideGroup);
                    break;
                case RoleAdjusted.DiscordServerJoined:
                    if (_config.DiscordServerJoinedOxideGroup == "" || _config.DiscordServerJoinedOxideGroup == null) return;

                    if (type == RoleAdjustmentType.Add)
                        permission.AddUserGroup(player.Id, _config.DiscordServerJoinedOxideGroup);
                    else
                        permission.RemoveUserGroup(player.Id, _config.DiscordServerJoinedOxideGroup);
                    break;
                case RoleAdjusted.DiscordServerBoosted:
                    if (_config.DiscordBoostedOxideGroup == "" || _config.DiscordBoostedOxideGroup == null) return;

                    if (type == RoleAdjustmentType.Add)
                        permission.AddUserGroup(player.Id, _config.DiscordBoostedOxideGroup);
                    else
                        permission.RemoveUserGroup(player.Id, _config.DiscordBoostedOxideGroup);
                    break;
            }
        }

        [Serializable]
        public class LinkPlayer
        {
            public bool Exists { get; set; }
            public string SteamID { get; set; }
            public string DiscordID { get; set; }
            public bool IsInDiscord { get; set; }
            public bool IsInSteamGroup { get; set; }
            public bool IsBoostingDiscordServer { get; set; }

            public static LinkPlayer Create(string json, LinkPlayer oldData)
            {
                JObject jObject = JObject.Parse(json);

                bool discordLimited = (bool)jObject["DiscordRateLimited"];

                if (oldData == null)
                {
                    oldData = new LinkPlayer()
                    {
                        Exists = false,
                        SteamID = "",
                        DiscordID = "",
                        IsInDiscord = false,
                        IsBoostingDiscordServer = false,
                        IsInSteamGroup = false
                    };
                }

                LinkPlayer lPlayer = new LinkPlayer()
                {
                    Exists = (bool)jObject["Exists"],
                    SteamID = (string)jObject["SteamID"],
                    DiscordID = (string)jObject["DiscordID"],
                    IsInDiscord = discordLimited ? oldData.IsInDiscord : (bool)jObject["InDiscordServer"],
                    IsBoostingDiscordServer = discordLimited ? oldData.IsBoostingDiscordServer : (bool)jObject["IsBoostingDiscord"],
                    IsInSteamGroup = (bool)jObject["InSteamGroup"]
                };

                return lPlayer;
            }

            [JsonIgnore]
            private JObject serializedLinkPlayerObject;

            internal JObject ToJObject()
            {
                if (serializedLinkPlayerObject != null)
                    return serializedLinkPlayerObject;

                serializedLinkPlayerObject["Exists"] = Exists;
                serializedLinkPlayerObject["SteamID"] = SteamID;
                serializedLinkPlayerObject["DiscordID"] = DiscordID;
                serializedLinkPlayerObject["IsInDiscord"] = IsInDiscord;
                serializedLinkPlayerObject["IsInSteamGroup"] = IsInSteamGroup;
                serializedLinkPlayerObject["IsBoostingDiscordServer"] = IsBoostingDiscordServer;

                return serializedLinkPlayerObject;
            }
        }

        [Serializable]
        public class LinkWebData
        {
            public bool SteamGroup { get; set; }
            public bool DiscordServer { get; set; }

            [JsonIgnore]
            private JObject serializeLinkWebDataObject;

            internal JObject ToJObject()
            {
                if (serializeLinkWebDataObject != null)
                    return serializeLinkWebDataObject;

                serializeLinkWebDataObject["SteamGroup"] = SteamGroup;
                serializeLinkWebDataObject["DiscordServer"] = SteamGroup;

                return serializeLinkWebDataObject;
            }
        }
    }
}

public static class QueueExtensions
{
    public static IEnumerable<T> DequeueChunk<T>(this Queue<T> queue, int chunkSize)
    {
        for (int i = 0; i < chunkSize && queue.Count > 0; i++)
        {
            yield return queue.Dequeue();
        }
    }
}
