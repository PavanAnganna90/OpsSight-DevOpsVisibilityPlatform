import Image from 'next/image';

export default function FloatingIllustration() {
  return (
    <div className="absolute top-12 right-10 w-48 hidden md:block animate-bounce-slow opacity-80">
      <Image
        src="/teamwork-illustration.png"
        alt="Teamwork Sidekick"
        width={192}
        height={192}
        className="rounded-xl shadow-lg"
      />
    </div>
  );
}
