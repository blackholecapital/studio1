import type { CSSProperties } from "react";

export type FloatingCardModel = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type FloatingCardProps = {
  card: FloatingCardModel;
  isSelected: boolean;
  onSelect: (cardId: string) => void;
};

export function FloatingCard({ card, isSelected, onSelect }: FloatingCardProps) {
  const style: CSSProperties = {
    left: card.x,
    top: card.y,
    width: card.w,
    height: card.h
  };

  return (
    <button
      className={`floatingCard ${isSelected ? "isSelected" : ""}`}
      style={style}
      onClick={() => onSelect(card.id)}
    >
      <span className="cardStamp">
        {card.label} {card.w} × {card.h}
      </span>
    </button>
  );
}
