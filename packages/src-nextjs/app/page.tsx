import { AppVersion } from "@/components/app-version";

export default function Home() {
  return (
    <div className="workspace">
      <header className="wordmark">Locus<span className="brand-dot" aria-hidden="true" /></header>
      <main>
        <p className="eyebrow">A workspace for study and research</p>
        <h1>Make room<br />for understanding.</h1>
        <p className="intro">A place for your reading, your notes, and the connections in between.</p>
        <p className="status">Your workspace is taking shape.</p>
      </main>
      <footer><AppVersion /></footer>
    </div>
  );
}
