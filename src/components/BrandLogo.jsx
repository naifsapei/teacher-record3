const LOGO_URL = "https://media.base44.com/images/public/6a18d47e827f674eacf047fc/99de6c53b_Photoroom-20260707_062230.png";
const SIDEBAR_LOGO_URL = "https://media.base44.com/images/public/6a18d47e827f674eacf047fc/7907127f1_Photoroom-20260707_062230.png";

// Shared "splash" presentation: rounded translucent card + soft shadow + ring.
function LogoCard({ src, imgClass, pad = "p-4 sm:p-5", className = "" }) {
  return (
    <div className={`rounded-3xl bg-white/70 backdrop-blur-sm shadow-lg ring-1 ring-black/5 ${pad} ${className}`}>
      <img src="https://media.base44.com/images/public/6a18d47e827f674eacf047fc/b196b2024_1000898444.png"

      alt="سجل المعلم"
      className={`block ${imgClass} h-auto object-contain select-none`}
      draggable={false} />
      
    </div>);

}

export default function BrandLogo({ className = "", size = "default" }) {
  if (size === "auth") {
    return (
      <div className={`w-full flex justify-center items-center mt-2 mb-6 ${className}`}>
        <LogoCard src={LOGO_URL} imgClass="w-[130px] sm:w-[150px] md:w-[170px] max-w-[60vw]" />
      </div>);

  }

  if (size === "sidebar") {
    return (
      <div className={`w-full flex justify-center items-center mt-3 mb-3 ${className}`}>
        <img src="https://media.base44.com/images/public/6a18d47e827f674eacf047fc/b1cc927fb_1000898874.png"

        alt="سجل المعلم"
        className="block w-[150px] sm:w-[168px] max-w-[80%] h-auto object-contain select-none rounded-2xl"
        draggable={false} />
        
      </div>);

  }

  // default
  return (
    <div className={`w-full flex justify-center items-center mt-[clamp(20px,5vh,42px)] mb-[clamp(16px,3vh,26px)] ${className}`}>
      <LogoCard src={LOGO_URL} imgClass="w-[130px] sm:w-[150px] md:w-[170px] max-w-[60vw]" />
    </div>);

}