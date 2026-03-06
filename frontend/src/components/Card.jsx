/**
 * Card Component (Function-Based)
 * 
 * A reusable clickable card used on the Landing Page dashboard.
 * Accepts a title string and an optional onClick handler.
 */
function Card({ title, onClick }) {
  return (
    <div className="card" onClick={onClick}>
      {title}
    </div>
  );
}

export default Card;
