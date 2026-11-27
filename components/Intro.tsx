import type { ReactNode } from "react";
import { LocationIcon } from "./icons";

/** Headline block. The quick-look card is passed in as `aside`. */
export function Intro({ aside }: { aside: ReactNode }) {
  return (
    <section className="intro" aria-labelledby="page-title">
      <div className="intro-copy">
        <p className="location">
          <LocationIcon />
          율곡관 지하 1층
        </p>
        <h1 id="page-title">
          <span className="headline-lead">내려가기 전에,</span>
          <br />
          <span>세탁실 먼저 확인.</span>
        </h1>
        <p className="intro-description">기기별 작동 상태와 남은 시간을 한눈에.</p>
      </div>
      {aside}
    </section>
  );
}
