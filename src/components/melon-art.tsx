export function MelonArt({small = false}: {small?: boolean}) {
  return <div className={`melon-art ${small?'small':''}`} aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><span className="art-spark">✦</span><div className="melon"><div className="melon-flesh">{Array.from({length:9},(_,i)=><i key={i} style={{'--i':i} as React.CSSProperties}/>)}</div></div><div className="fruit-orange"/><div className="fruit-lemon"/><div className="fruit-grape"/><span className="cross cross-one">+</span><span className="cross cross-two">+</span></div>;
}
