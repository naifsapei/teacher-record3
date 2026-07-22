export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      <div className="flex flex-col items-center px-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="rounded-3xl bg-white/70 backdrop-blur-sm shadow-lg ring-1 ring-black/5 p-5 sm:p-6">
          <img src="https://media.base44.com/images/public/6a18d47e827f674eacf047fc/b196b2024_1000898444.png"

          alt="سجل المعلم"
          className="w-[130px] sm:w-[150px] md:w-[170px] max-w-[60vw] h-auto object-contain select-none"
          draggable={false} />
          
        </div>
        <div className="mt-5 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#00B050] animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2 w-2 rounded-full bg-[#003366] animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2 w-2 rounded-full bg-[#00B050] animate-bounce" />
        </div>
      </div>
    </div>);

}