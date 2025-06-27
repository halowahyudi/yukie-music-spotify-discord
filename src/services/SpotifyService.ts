import SpotifyWebApi from "spotify-web-api-node";
import { Track } from "../types/Track";

export class SpotifyService {
  private spotifyApi: SpotifyWebApi;
  private accessToken: string | null = null;

  constructor() {
    this.spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    });
  }

  public async initialize(): Promise<void> {
    try {
      const data = await this.spotifyApi.clientCredentialsGrant();
      this.accessToken = data.body.access_token;
      this.spotifyApi.setAccessToken(this.accessToken);

      // refresh token every 50 minutes
      setInterval(() => {
        this.refreshToken();
      }, 50 * 60 * 1000);

      console.log("✅ Spotify API initialized");
    } catch (error) {
      console.error("❌ Error initializing Spotify API:", error);
      throw error;
    }
  }

  private async refreshToken(): Promise<void> {
    try {
      const data = await this.spotifyApi.clientCredentialsGrant();
      this.accessToken = data.body.access_token;
      this.spotifyApi.setAccessToken(this.accessToken);
      console.log("🔄 Spotify token refreshed");
    } catch (error) {
      console.error("❌ Error refreshing Spotify token:", error);
    }
  }

  public extractPlaylistId(url: string): string | null {
    const regex = /playlist[\/:]([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  public extractTrackId(url: string): string | null {
    const regex = /track[\/:]([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  public async getPlaylistTracks(
    playlistId: string,
    requestedBy: string
  ): Promise<Track[]> {
    try {
      if (!playlistId || playlistId.length !== 22) {
        throw new Error("Invalid playlist ID");
      }

      const data = await this.spotifyApi.getPlaylistTracks(playlistId, {
        market: "ID",
        limit: 100,
      });

      const tracks: Track[] = [];

      for (const item of data.body.items) {
        if (item.track && item.track.type === "track") {
          const track = item.track as SpotifyApi.TrackObjectFull;
          tracks.push({
            title: track.name,
            artist: track.artists.map((a) => a.name).join(", "),
            duration: track.duration_ms,
            thumbnail: track.album.images[0]?.url,
            url: track.external_urls.spotify,
            spotifyId: track.id,
            requestedBy,
          });
        }
      }

      return tracks;
    } catch (error) {
      console.error("❌ Error fetching playlist tracks:", error);
      throw error;
    }
  }

  public async getTrackById(
    trackId: string,
    requestedBy: string
  ): Promise<Track | null> {
    try {
      const data = await this.spotifyApi.getTrack(trackId);
      const track = data.body;

      return {
        title: track.name,
        artist: track.artists.map((a) => a.name).join(", "),
        duration: track.duration_ms,
        thumbnail: track.album.images[0]?.url,
        url: track.external_urls.spotify,
        spotifyId: track.id,
        requestedBy,
      };
    } catch (error) {
      console.error("❌ Error fetching track by ID:", error);
      return null;
    }
  }

  public async searchTrack(
    query: string,
    requestedBy: string
  ): Promise<Track | null> {
    try {
      const data = await this.spotifyApi.searchTracks(query, { limit: 1 });
      const track = data.body.tracks?.items[0];

      if (!track) return null;

      return {
        title: track.name,
        artist: track.artists.map((a) => a.name).join(", "),
        duration: track.duration_ms,
        thumbnail: track.album.images[0]?.url,
        url: track.external_urls.spotify,
        spotifyId: track.id,
        requestedBy,
      };
    } catch (error) {
      console.error("❌ Error searching track:", error);
      return null;
    }
  }

  public isYouTubeUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url);
  }
}
