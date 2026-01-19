import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getArticleById, markRead } from "../../db/articles";
import type { Article } from "../../db";
import ReaderContent from "../../reader/ReaderContent";

function ReaderPage() {
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadArticle = async () => {
      if (!id) {
        setError("Missing article id.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const articleRecord = await getArticleById(id);

        if (!isActive) {
          return;
        }

        if (!articleRecord) {
          setArticle(null);
          setError("Article not found.");
          setIsLoading(false);
          return;
        }

        setArticle(articleRecord);
        setIsLoading(false);
        await markRead(articleRecord.id);
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load article.",
        );
        setIsLoading(false);
      }
    };

    loadArticle();

    return () => {
      isActive = false;
    };
  }, [id]);

  return (
    <section className="page">
      <h2 className="page__title">Reader</h2>
      {isLoading ? (
        <p className="page__status">Loading article...</p>
      ) : null}
      {error ? <p className="page__status page__status--error">{error}</p> : null}
      {article && !isLoading ? (
        <ReaderContent
          title={article.title}
          url={article.url}
          contentHtml={article.content_html}
        />
      ) : null}
    </section>
  );
}

export default ReaderPage;
