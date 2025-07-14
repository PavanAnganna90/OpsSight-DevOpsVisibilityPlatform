import Head from 'next/head';
import HeroSection from '@/components/HeroSection';
import Illustration from '@/components/Illustration';
import FeatureCard from '@/components/FeatureCard';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import FloatingIllustration from '@/components/FloatingIllustration';

export default function Home() {
  const features = [
    {
      title: 'AI-Powered Insights',
      description: 'Predict system failures, detect anomalies, and optimize costs.',
    },
    {
      title: 'Multi-Cloud Dashboards',
      description: 'One UI for AWS, Azure, and GCP.',
    },
    {
      title: 'OpsCopilot Chatbot',
      description: 'A smart assistant that understands your infra deeply.',
    },
  ];

  return (
    <>
      <Head>
        <title>OpsSight | Creative DevOps Intelligence</title>
      </Head>
      <main className="relative min-h-screen bg-[#fefefc] dark:bg-gray-950 text-gray-800 dark:text-white flex flex-col items-center px-6 py-10">
        <Navbar />
        <FloatingIllustration />
        <HeroSection />
        <Illustration />
        <section className="mt-10 grid md:grid-cols-3 gap-6 text-left max-w-6xl w-full">
          {features.map((feature, idx) => (
            <FeatureCard key={idx} title={feature.title} description={feature.description} />
          ))}
        </section>
        <Toast message="AI Insight: Unused cloud resources detected." />
      </main>
    </>
  );
}
