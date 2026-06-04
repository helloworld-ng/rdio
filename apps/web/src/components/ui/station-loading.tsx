export function StationLoading({ failed }: { failed: boolean }) {
  return (
    <section aria-label="Station loading" className="empty-page">
      <p>
        {failed
          ? "Could not connect to the API. Check that the API server is running."
          : "Loading station…"}
      </p>
    </section>
  );
}
