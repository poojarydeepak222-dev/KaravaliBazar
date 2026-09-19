import { useState } from "react";

const updates = [
  { title: "Latest Updates", text: "Check this section for newly published public information and announcements.", tag: "Updates" },
  { title: "Charts & Data", text: "Browse published charts and reference information in a simple mobile-friendly format.", tag: "Data" },
  { title: "Announcements", text: "Important notices and platform announcements will appear here.", tag: "Notice" },
];

const App = () => {
  const [active, setActive] = useState("home");

  const scrollTo = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button onClick={() => scrollTo("home")} className="text-xl font-black tracking-tight">
            <span className="text-orange-500">Matka</span><span className="text-slate-900">222</span>
          </button>
          <nav className="hidden gap-6 text-sm font-semibold sm:flex">
            {["home", "updates", "about", "contact"].map((item) => (
              <button key={item} onClick={() => scrollTo(item)} className={active === item ? "text-orange-500" : "text-slate-600 hover:text-orange-500"}>
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </nav>
          <button onClick={() => scrollTo("updates")} className="rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-sm">
            Explore
          </button>
        </div>
      </header>

      <main>
        <section id="home" className="bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-orange-300">
                Information Hub
              </p>
              <h1 className="text-4xl font-black leading-tight text-white sm:text-6xl">
                Matka222
                <span className="block text-orange-400">Simple. Clear. Informative.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                A mobile-first platform for public updates, announcements, charts and useful reference information.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={() => scrollTo("updates")} className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600">
                  View Updates
                </button>
                <button onClick={() => scrollTo("about")} className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-bold text-white hover:bg-white/15">
                  About Matka222
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="updates" className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-widest text-orange-500">What’s new</p>
            <h2 className="mt-2 text-3xl font-black">Latest information</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {updates.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">{item.tag}</span>
                <h3 className="mt-5 text-xl font-black">{item.title}</h3>
                <p className="mt-3 leading-6 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="about" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-3xl font-black">About Matka222</h2>
            <p className="mt-4 max-w-3xl leading-7 text-slate-600">
              Matka222 is being presented as a non-gambling information website. The public site does not provide betting, wagering, deposits, withdrawals, paid gameplay or gambling transactions.
            </p>
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-3xl bg-slate-900 p-8 text-white sm:p-12">
            <h2 className="text-3xl font-black">Contact & notices</h2>
            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Use this area for future public contact details, announcements and support information.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Matka222</span>
          <span>Information & public resources</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
