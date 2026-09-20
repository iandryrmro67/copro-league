-- Supabase-specific permissions and private bucket; no anon/authenticated policies.
REVOKE ALL ON TABLE public.players, public.seasons, public.admins, public.settings,
 public.player_attributes, public.matches, public.teams, public.match_players,
 public.match_player_stats, public.match_events, public.videos, public.season_awards,
 public.player_awards, public.award_definitions, public.award_identities,
 public.award_votes, public.recognition_seasons, public.media_uploads FROM anon, authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('league-media','league-media',false,52428800,
 ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']);
