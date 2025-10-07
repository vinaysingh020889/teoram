declare module "react-wordcloud" {
  import { FC } from "react";

  export interface Word {
    text: string;
    value: number;
  }

  export interface Options {
    fontFamily?: string;
    fontSizes?: [number, number];
    rotations?: number;
    rotationAngles?: [number, number];
    scale?: "linear" | "log" | "sqrt";
    spiral?: "archimedean" | "rectangular";
  }

  export interface Callbacks {
    onWordClick?: (word: Word) => void;
    onWordMouseOver?: (word: Word) => void;
    onWordMouseOut?: (word: Word) => void;
  }

  export interface WordCloudProps {
    words: Word[];
    options?: Options;
    callbacks?: Callbacks;
  }

  const WordCloud: FC<WordCloudProps>;
  export default WordCloud;
}
