"use client";
import {
  formatActionTime,
  parseActionTime,
  shiftActionTime,
} from "@/lib/annotation-time";
type Props = {
  value: string;
  duration: number;
  label: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onFollowVideo?: () => void;
};
export function AnnotationTimeControl({
  value,
  duration,
  label,
  disabled,
  onChange,
  onFollowVideo,
}: Props) {
  const time = parseActionTime(value);
  const minutes = time == null ? "" : Math.floor(time / 60),
    seconds = time == null ? "" : time % 60;
  const max = Math.min(9999 * 60 + 59, Math.max(60, duration * 60, time ?? 0));
  function part(kind: "minutes" | "seconds", value: string) {
    if (value === "") {
      onChange("");
      return;
    }
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    const next =
      kind === "minutes"
        ? Math.min(9999, Math.max(0, Math.floor(n))) * 60 +
          (typeof seconds === "number" ? seconds : 0)
        : (typeof minutes === "number" ? minutes : 0) * 60 +
          Math.min(59, Math.max(0, Math.floor(n)));
    onChange(formatActionTime(next));
  }
  return (
    <fieldset className="action-time-control" disabled={disabled}>
      <legend>{label}</legend>
      <div className="action-time-fields">
        <label>
          <span>Minutes</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={9999}
            step={1}
            aria-label="Minutes de l’action"
            value={minutes}
            placeholder="—"
            onChange={(e) => part("minutes", e.target.value)}
          />
        </label>
        <span className="action-time-colon" aria-hidden="true">
          :
        </span>
        <label>
          <span>Secondes</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            step={1}
            aria-label="Secondes de l’action"
            value={seconds}
            placeholder="—"
            onChange={(e) => part("seconds", e.target.value)}
          />
        </label>
        {onFollowVideo && (
          <button className="button" type="button" onClick={onFollowVideo}>
            Suivre la vidéo
          </button>
        )}
      </div>
      <div className="action-time-steps" aria-label="Ajuster le temps">
        {[-60, -30, -5, -1, 1, 5, 30, 60].map((delta) => (
          <button
            key={delta}
            className="button"
            type="button"
            disabled={disabled || (delta < 0 && time === 0)}
            aria-label={`${delta < 0 ? "Reculer" : "Avancer"} de ${Math.abs(delta)} seconde${Math.abs(delta) === 1 ? "" : "s"}`}
            onClick={() => onChange(shiftActionTime(value, delta))}
          >
            {delta < 0 ? "−" : "+"}
            {Math.abs(delta) === 60 ? "1 min" : `${Math.abs(delta)} s`}
          </button>
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={time ?? 0}
        aria-label="Régler le temps de l’action"
        aria-valuetext={
          time == null ? "Temps non renseigné" : formatActionTime(time)
        }
        onChange={(e) => onChange(formatActionTime(Number(e.target.value)))}
      />
      <div className="action-time-scale">
        <span>00:00</span>
        <span>
          {time == null
            ? "Temps non renseigné"
            : "Ajuste avec les boutons ou le curseur"}
        </span>
        <span>{formatActionTime(max)}</span>
      </div>
    </fieldset>
  );
}
