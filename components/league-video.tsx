"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Pause,
  Play,
  Maximize2,
  Minimize2,
  RectangleHorizontal,
} from "lucide-react";
import { youtubeId } from "@/lib/engine";
import { MAX_VIDEO_BYTES } from "@/lib/media-policy";
import { uploadMedia } from "@/lib/media-upload";
import { reviewProgress, type ReviewRange } from "@/lib/annotation-controls";

type YouTubePlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
};
type YouTubeAPI = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      host: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: () => void;
        onStateChange: (event: { data: number }) => void;
        onError: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
};
export type VideoStatus = "loading" | "ready" | "error";
export type VideoPlayerHandle = {
  isPlaying: () => boolean;
  time: () => number;
  duration: () => number;
  seek: (seconds: number) => void;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  step: (seconds: number) => void;
  speed: (rate: number) => void;
  review: (ranges: ReviewRange[]) => boolean;
};
export function formatVideoTime(seconds: number) {
  const whole = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}
export const VideoPlayer = forwardRef<
  VideoPlayerHandle,
  {
    src: string;
    initialTime?: number;
    className?: string;
    annotation?: boolean;
    theatre?: boolean;
    onTheatre?: () => void;
    onFullscreen?: () => void;
    fullscreenActive?: boolean;
    onTime?: (seconds: number) => void;
    onStatus?: (status: VideoStatus) => void;
  }
>(function VideoPlayer(
  {
    src,
    initialTime = 0,
    className,
    annotation = false,
    theatre = false,
    onTheatre,
    onFullscreen,
    fullscreenActive,
    onTime,
    onStatus,
  },
  ref,
) {
  const playerRoot = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false),
    [duration, setDuration] = useState(0),
    [viewMessage, setViewMessage] = useState("");
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === playerRoot.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  async function toggleFullscreen() {
    try {
      setViewMessage("");
      if (document.fullscreenElement === playerRoot.current)
        await document.exitFullscreen();
      else if (playerRoot.current?.requestFullscreen)
        await playerRoot.current.requestFullscreen();
      else {
        const native = html.current as
          (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
        if (native?.webkitEnterFullscreen) native.webkitEnterFullscreen();
        else
          setViewMessage(
            "Le plein écran est indisponible dans ce navigateur. Utilise le mode théâtre.",
          );
      }
    } catch {
      setViewMessage(
        "Le navigateur a refusé le plein écran. Utilise le mode théâtre.",
      );
    }
  }
  const host = useRef<HTMLDivElement>(null),
    html = useRef<HTMLVideoElement>(null),
    yt = useRef<YouTubePlayer | null>(null),
    timeRef = useRef(0);
  const playlist = useRef<{
    ranges: ReviewRange[];
    index: number;
    awaitingSeek: boolean;
  } | null>(null);
  const [time, setTime] = useState(0),
    [ready, setReady] = useState(false),
    [playing, setPlaying] = useState(false),
    [reviewing, setReviewing] = useState(false),
    [rate, setRate] = useState(1),
    [error, setError] = useState("");
  useEffect(() => {
    onStatus?.(error ? "error" : ready ? "ready" : "loading");
  }, [error, ready, onStatus]);
  const id = youtubeId(src),
    local =
      src.startsWith("blob:") ||
      /^\/api\/videos\/[0-9a-f-]+\.(mp4|mov|webm)$/.test(src);
  const onTimeRef = useRef(onTime);
  useLayoutEffect(() => {
    onTimeRef.current = onTime;
  }, [onTime]);
  function stopReview() {
    playlist.current = null;
    setReviewing(false);
  }
  function seekRaw(seconds: number) {
    if (id) yt.current?.seekTo?.(seconds, true);
    else if (html.current) html.current.currentTime = seconds;
  }
  function playRaw() {
    if (id) yt.current?.playVideo?.();
    else if (html.current)
      void html.current.play().catch(() => {
        stopReview();
        setError("Lecture impossible.");
      });
  }
  function pauseRaw() {
    if (id) yt.current?.pauseVideo?.();
    else html.current?.pause();
  }
  function update(value: number) {
    const next = Number.isFinite(value) ? Math.max(0, value) : 0;
    timeRef.current = next;
    setTime(next);
    onTimeRef.current?.(next);
    const mediaDuration = Number(
      id ? yt.current?.getDuration?.() : html.current?.duration,
    );
    if (Number.isFinite(mediaDuration) && mediaDuration > 0)
      setDuration(mediaDuration);
    const list = playlist.current;
    if (!list) return;
    const progress = reviewProgress(
      list.ranges[list.index],
      next,
      list.awaitingSeek,
    );
    if (progress === "waiting") return;
    if (list.awaitingSeek) {
      list.awaitingSeek = false;
      playRaw();
    }
    if (progress === "finished") {
      list.index++;
      if (list.index >= list.ranges.length) {
        stopReview();
        pauseRaw();
      } else {
        list.awaitingSeek = true;
        pauseRaw();
        seekRaw(list.ranges[list.index].start);
      }
    }
  }
  useEffect(() => {
    // Reset the display when replacing the external media player.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    stopReview();
    setReady(false);
    setDuration(0);
    setError("");
    setPlaying(false);
    update(initialTime);
    if (!id || !host.current) return;
    let disposed = false;
    const init = () => {
      const YT = (window as Window & { YT?: YouTubeAPI }).YT;
      if (disposed || !YT?.Player || !host.current) return false;
      const element = document.createElement("div");
      host.current.replaceChildren(element);
      yt.current = new YT.Player(element, {
        videoId: id,
        host: "https://www.youtube.com",
        playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: () => {
            if (!disposed) {
              setReady(true);
              if (initialTime) yt.current?.seekTo?.(initialTime, true);
            }
          },
          onStateChange: (event: { data: number }) => {
            setPlaying(event.data === 1);
            if (event.data === 0) stopReview();
          },
          onError: (event: { data: number }) => {
            stopReview();
            setReady(false);
            setError(
              event.data === 100
                ? "Vidéo privée, supprimée ou inaccessible à ce compte YouTube."
                : [101, 150].includes(event.data)
                  ? "YouTube interdit la lecture intégrée de cette vidéo (restriction d’âge ou intégration désactivée)."
                  : event.data === 153
                    ? "YouTube ne reconnaît pas ce lecteur intégré. Ouvrez la vidéo sur YouTube ou utilisez le fichier local."
                    : "YouTube ne permet pas de lire cette vidéo ici. Ouvrez-la sur YouTube ou utilisez le fichier local.",
            );
          },
        },
      });
      return true;
    };
    let poll: ReturnType<typeof setInterval> | undefined;
    if (!init()) {
      if (
        !document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]',
        )
      ) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
      poll = setInterval(() => {
        if (init()) clearInterval(poll);
      }, 200);
    }
    const timer = setInterval(() => {
      if (yt.current?.getCurrentTime)
        update(Number(yt.current.getCurrentTime()));
    }, 250);
    return () => {
      disposed = true;
      playlist.current = null;
      if (poll) clearInterval(poll);
      clearInterval(timer);
      yt.current?.destroy?.();
      yt.current = null;
    };
    // Only source changes replace the player; initialTime is a saved opening position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  const api: VideoPlayerHandle = {
    isPlaying: () =>
      id
        ? yt.current?.getPlayerState?.() === 1
        : !!html.current && !html.current.paused,
    time: () =>
      id
        ? Number(yt.current?.getCurrentTime?.() ?? timeRef.current)
        : Number(html.current?.currentTime ?? timeRef.current),
    duration: () =>
      Number(
        id ? (yt.current?.getDuration?.() ?? 0) : (html.current?.duration ?? 0),
      ) || 0,
    seek: (seconds) => {
      stopReview();
      const next = Math.max(0, seconds);
      seekRaw(next);
      update(next);
    },
    play: () => playRaw(),
    pause: () => {
      stopReview();
      pauseRaw();
    },
    toggle: () => {
      if (
        id
          ? yt.current?.getPlayerState?.() === 1
          : html.current && !html.current.paused
      ) {
        stopReview();
        pauseRaw();
      } else playRaw();
    },
    step: (seconds) => api.seek(api.time() + seconds),
    speed: (next) => {
      if (![0.5, 1, 1.5, 2].includes(next)) return;
      if (id) yt.current?.setPlaybackRate?.(next);
      // Native media properties are controlled through the imperative player API.
      // eslint-disable-next-line react-hooks/immutability
      else if (html.current) html.current.playbackRate = next;
      setRate(next);
    },
    review: (ranges) => {
      if (!ready) return false;
      const duration = api.duration() || Infinity;
      const valid = ranges
        .map((r) => ({
          start: Math.max(0, r.start),
          end: Math.min(duration, r.end),
        }))
        .filter(
          (r) =>
            Number.isFinite(r.start) &&
            Number.isFinite(r.end) &&
            r.end > r.start,
        );
      if (
        !valid.length ||
        (!id && !html.current) ||
        (id && !yt.current?.playVideo)
      )
        return false;
      playlist.current = { ranges: valid, index: 0, awaitingSeek: true };
      setReviewing(true);
      setError("");
      pauseRaw();
      seekRaw(valid[0].start);
      return true;
    },
  };
  useImperativeHandle(ref, () => api);
  const onKey = (event: React.KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('input,textarea,select,button,[contenteditable="true"]'))
      return;
    if (event.code === "Space") {
      event.stopPropagation();
      event.preventDefault();
      api.toggle();
    } else if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
      event.stopPropagation();
      event.preventDefault();
      api.step(
        (event.code === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 5 : 1),
      );
    }
  };
  return (
    <div
      ref={playerRoot}
      className={
        (className ?? "panel formstack") +
        (annotation ? " annotation-video" : "")
      }
      tabIndex={0}
      onKeyDown={onKey}
      aria-label="Lecteur vidéo, espace pour lecture ou pause, flèches pour avancer ou reculer"
    >
      <div
        className="youtube"
        ref={host}
        style={{ display: id ? "block" : "none" }}
      />
      {local && (
        <video
          ref={html}
          src={src}
          controls={!annotation}
          playsInline
          preload="metadata"
          style={{ width: "100%", maxHeight: annotation ? undefined : 520 }}
          onLoadedMetadata={(event) => {
            setReady(true);
            setDuration(event.currentTarget.duration);
            if (initialTime) event.currentTarget.currentTime = initialTime;
          }}
          onTimeUpdate={(e) => update(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            stopReview();
            setPlaying(false);
          }}
          onError={() => {
            stopReview();
            setError(
              "La vidéo ne peut pas être lue dans ce navigateur. Le fichier MOV peut nécessiter une conversion en MP4.",
            );
          }}
        />
      )}
      {!id && !local && (
        <p className="muted">
          Ajoutez une vidéo YouTube ou importez un fichier pour analyser le
          match.
        </p>
      )}
      {annotation && (
        <div className="video-seek">
          <label>
            Position dans la vidéo{" "}
            <strong>
              {formatVideoTime(time)} / {formatVideoTime(duration)}
            </strong>
            <input
              type="range"
              aria-label="Position dans la vidéo"
              min={0}
              max={duration || 0}
              step={1}
              value={Math.min(time, duration || 0)}
              disabled={!ready || !duration}
              onChange={(e) => api.seek(Number(e.target.value))}
            />
          </label>
        </div>
      )}
      <div className="actions video-transport">
        <button
          type="button"
          className="button"
          disabled={!ready}
          onClick={() => api.step(-1)}
        >
          −1 s
        </button>
        <button
          type="button"
          className="button primary"
          disabled={!ready}
          onClick={() => api.toggle()}
        >
          {playing ? (
            <Pause size={14} aria-hidden="true" />
          ) : (
            <Play size={14} aria-hidden="true" />
          )}
          {playing ? "Pause" : "Lecture"}
        </button>
        <button
          type="button"
          className="button"
          disabled={!ready}
          onClick={() => api.step(1)}
        >
          +1 s
        </button>
        <strong className="accent" aria-live="off">
          {formatVideoTime(time)}
        </strong>
        <label className="video-speed">
          <span>Vitesse</span>{" "}
          <select
            aria-label="Vitesse de lecture"
            value={rate}
            onChange={(e) => api.speed(Number(e.target.value))}
          >
            {[0.5, 1, 1.5, 2].map((n) => (
              <option key={n} value={n}>
                {n}×
              </option>
            ))}
          </select>
        </label>
        {annotation && onTheatre && (
          <button
            type="button"
            className="button"
            aria-pressed={theatre}
            onClick={onTheatre}
          >
            <RectangleHorizontal size={16} aria-hidden="true" />
            {theatre ? "Quitter le mode théâtre" : "Mode théâtre"}
          </button>
        )}
        {annotation && (
          <button
            type="button"
            className="button"
            onClick={() => onFullscreen ? onFullscreen() : void toggleFullscreen()}
          >
            {(fullscreenActive ?? fullscreen) ? (
              <Minimize2 size={16} aria-hidden="true" />
            ) : (
              <Maximize2 size={16} aria-hidden="true" />
            )}
            {(fullscreenActive ?? fullscreen) ? "Quitter le plein écran" : "Plein écran"}
          </button>
        )}
        {reviewing && (
          <button type="button" className="button" onClick={() => api.pause()}>
            Arrêter la sélection
          </button>
        )}
      </div>
      {id && (
        <p className="muted">
          Vidéo privée ou limitée par âge ?{" "}
          <a
            className="textbutton"
            target="_blank"
            rel="noopener noreferrer"
            href={
              "https://www.youtube.com/watch?v=" +
              id +
              "&t=" +
              Math.floor(time) +
              "s"
            }
          >
            Ouvrir sur YouTube à {formatVideoTime(time)}
          </a>
          . Pour annoter avec un temps synchronisé, utilisez le fichier local.
        </p>
      )}
      {viewMessage && <p role="status">{viewMessage}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
export function VideoSource({value,onChange,onLocal}:{value:string;onChange:(url:string)=>void;onLocal?:(file:File)=>void}){const [tab,setTab]=useState<'youtube'|'file'>(value.startsWith('/api/videos/')?'file':'youtube'),[progress,setProgress]=useState<number|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),xhr=useRef<AbortController|null>(null);
 const upload=async(file:File)=>{setError('');if(file.size>MAX_VIDEO_BYTES){if(onLocal){onLocal(file);return}setError('L’envoi au stockage est limité à 50 Mo. Ouvre ce fichier localement depuis l’atelier d’analyse.');return}if(!/\.(mp4|mov|webm)$/i.test(file.name)){setError('Choisissez un fichier MP4, MOV ou WebM.');return}const controller=new AbortController();xhr.current=controller;setBusy(true);setProgress(0);try{const url=await uploadMedia('videos',file,{signal:controller.signal,onProgress:setProgress});setProgress(100);onChange(url)}catch(e){if((e as Error).name!=='AbortError')setError((e as Error).message);else setProgress(null)}finally{setBusy(false);xhr.current=null}};
 return <div className="panel formstack"><h3>Ajouter une vidéo</h3><div className="actions"><button type="button" className={tab==='youtube'?'button primary':'button'} onClick={()=>setTab('youtube')}>YouTube</button><button type="button" className={tab==='file'?'button primary':'button'} onClick={()=>setTab('file')}>Importer depuis l’ordinateur</button></div>{tab==='youtube'?<label className="field"><span>URL YouTube</span><input type="url" value={value.startsWith('/api/videos/')?'':value} placeholder="https://www.youtube.com/watch?v=…" onChange={e=>onChange(e.target.value)}/></label>:<><label className="field"><span>MP4, MOV ou WebM · 50 Mo maximum</span><input type="file" accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)upload(file)}}/></label>{busy&&<><progress value={progress??0} max="100" style={{width:'100%'}}/><span>{progress??0} %</span><button type="button" className="button" onClick={()=>xhr.current?.abort()}>Annuler l’envoi</button></>}{value.startsWith('/api/videos/')&&<p className="success">Vidéo importée et prête à lire.</p>}</>}<p className="muted">Les vidéos restent dans le stockage objet. Pour les longs matchs, ouvre le fichier localement dans l’atelier : aucune compression nécessaire. MOV : lecture selon les codecs du navigateur ; conversion automatique non disponible.</p>{onLocal&&<label className="local-video-choice"><strong>Lire un fichier de mon ordinateur</strong><span>Sans upload · pas de limite de taille imposée · MP4, MOV, WebM</span><input type="file" accept=".mp4,.mov,.webm" onChange={e=>{const f=e.target.files?.[0];if(f)onLocal(f)}}/><small>Le fichier reste sur cet appareil. Après rechargement, sélectionnez-le à nouveau ; les annotations restent enregistrées.</small></label>}{error&&<p role="alert" className="error">{error}</p>}</div>
}
