import { Activity } from "lucide-react";
import { formatSampleRate, mockHifiSignalInfo } from "@arlhifi/shared";

const signalRows = [
  ["Codec", mockHifiSignalInfo.codec],
  ["Sample Rate", formatSampleRate(mockHifiSignalInfo.sampleRateHz)],
  ["Bit Depth", `${mockHifiSignalInfo.bitDepth}-bit`],
  ["Output", mockHifiSignalInfo.outputDevice],
  ["Exclusive", mockHifiSignalInfo.exclusiveMode ? "On" : "Off"]
] as const;

export const HifiPanel = () => {
  return (
    <div className="hifi-panel glass-panel">
      <div className="hifi-panel-title">
        <Activity aria-hidden="true" color="var(--accent-mint)" size={17} />
        HiFi 信息面板
      </div>
      <dl className="hifi-panel-list">
        {signalRows.map(([label, value]) => (
          <div className="hifi-panel-row" key={label}>
            <dt className="hifi-panel-label">{label}</dt>
            <dd className="hifi-panel-value">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};
