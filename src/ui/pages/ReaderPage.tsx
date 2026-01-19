import { useParams } from "react-router-dom";

function ReaderPage() {
  const { id } = useParams();

  return (
    <section className="page">
      <h2>Reader</h2>
      <p>Reading article ID: {id ?? "(missing)"}.</p>
    </section>
  );
}

export default ReaderPage;
