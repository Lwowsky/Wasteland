import Container from "../Container/Container.jsx";

function Page({ children, className = "", containerClassName = "" }) {
  return (
    <main className={`page ${className}`.trim()}>
      <Container className={containerClassName}>{children}</Container>
    </main>
  );
}

export default Page;
