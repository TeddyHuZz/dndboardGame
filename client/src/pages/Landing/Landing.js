import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";

const banners = [
  {
    id: 1,
    title: "Forge Your Legend",
    subtitle: "Roll the Dice, Shape Your Destiny",
    description:
      "Embark on legendary quests in a world of magic, monsters, and mystery. Gather your party, vanquish fearsome foes, and write your own saga. Your adventure starts here.",
    image: "/images/banners/fantasy-dragon.jpg",
    cta: "Start Your Adventure",
    path: "/game-dashboard",
  },
  {
    id: 2,
    title: "Choose Your Champion",
    subtitle: "From Mighty Warriors to Arcane Sorcerers",
    description:
      "Explore a diverse roster of playable classes and races. Will you be a stoic dwarf warrior, a kind elven healer, or a wise human wizard? Each hero offers a unique path to victory.",
    image: "/images/banners/fantasy-adventurer.jpg",
    cta: "Discover the Heroes",
    path: "/characters",
  },
  {
    id: 3,
    title: "Master the Ancient Laws",
    subtitle: "Learn the Rules, Dominate the Game",
    description:
      "From basic combat mechanics to the intricacies of spellcasting, our comprehensive guide has everything you need to become a master tactician. Study the rules to outwit your opponents.",
    image: "/images/banners/dark-fantasy.jpg",
    cta: "Explore the Rules",
    path: "/rules",
  },
  {
    id: 4,
    title: "Join a Guild, Find Your Clan",
    subtitle: "Adventure is Better with Allies",
    description:
      "The journey doesn't end on the game board. Join our thriving community on Discord and social media to share stories, find a party, and connect with fellow adventurers from around the world.",
    image: "/images/banners/fantasy-wizard.jpg",
    cta: "Find Your Guild",
    path: "/community",
  },
  {
    id: 5,
    title: "Need Aid? Summon Us",
    subtitle: "Our Scribes Are Here to Help",
    description:
      "Have a question, a suggestion, or need to report a rogue bug? Consult our Frequently Asked Questions or send a message directly to our team. We're here to ensure your quest is a smooth one.",
    image: "/images/banners/fantasy-hero.jpg",
    cta: "Send a Missive",
    path: "/contact",
  },
];

export function Landing() {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let ticking = false;
    let rafId = null;
    let isTabVisible = true;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (document.hidden && rafId) {
        // Cancel any pending RAF when tab becomes hidden
        window.cancelAnimationFrame(rafId);
        rafId = null;
        ticking = false;
      }
    };

    const handleScroll = () => {
      // Don't process scroll if tab is hidden
      if (!isTabVisible) return;

      if (!ticking) {
        rafId = window.requestAnimationFrame(() => {
          const scrollPosition = window.scrollY;
          const windowHeight = window.innerHeight;
          const documentHeight =
            document.documentElement.scrollHeight - windowHeight;

          // Calculate scroll progress (0 to 1)
          const progress = Math.min(scrollPosition / documentHeight, 1);
          setScrollProgress(progress);

          // Determine which banner to show based on scroll position
          const bannerIndex = Math.min(
            Math.floor(progress * banners.length),
            banners.length - 1
          );
          setCurrentBanner(bannerIndex);

          ticking = false;
          rafId = null;
        });
        ticking = true;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("scroll", handleScroll);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // Memoize banner to prevent unnecessary recalculations
  const banner = useMemo(() => banners[currentBanner], [currentBanner]);

  return (
    <div className="banner-container">
      {/* Main Banner Section - Fixed */}
      <section className="banner-section">
        {/* Background Image with Parallax - ONLY RENDER CURRENT BANNER */}
        <div className="banner-background-wrapper">
          <div className="banner-background" style={{ opacity: 1 }}>
            <img
              src={banner.image || "/placeholder.svg"}
              alt={banner.title}
              className="banner-image"
              key={banner.id} // Force re-render on change
            />
            <div className="banner-gradient" />
          </div>
        </div>

        {/* Content */}
        <div className="banner-content-wrapper">
          <div className="banner-content">
            <div
              key={`subtitle-${banner.id}`}
              className="content-subtitle-wrapper"
            >
              <p className="content-subtitle">{banner.subtitle}</p>
            </div>

            <div key={`title-${banner.id}`} className="content-title-wrapper">
              <h2 className="content-title">{banner.title}</h2>
            </div>

            <div
              key={`description-${banner.id}`}
              className="content-description-wrapper"
            >
              <p className="content-description">{banner.description}</p>
            </div>

            <div key={`cta-${banner.id}`} className="content-cta-wrapper">
              <button
                className="content-cta-button"
                onClick={() => navigate(banner.path)}
              >
                {banner.cta}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="progress-indicators">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                const targetScroll =
                  (index / banners.length) *
                  (document.documentElement.scrollHeight - window.innerHeight);
                window.scrollTo({ top: targetScroll, behavior: "smooth" });
              }}
              className={`progress-dot ${
                currentBanner === index ? "active" : ""
              }`}
              aria-label={`Go to banner ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Spacer to enable scrolling */}
      <div
        className="scroll-spacer"
        style={{ height: `${banners.length * 100}vh` }}
      />
    </div>
  );
}

export default Landing;
