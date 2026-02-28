function Card({ title, onClick }) {
  return (
    <div className="card" onClick={onClick}>
      {title}
    </div>
  );
}

export default Card;
