import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface Props {
  params: { slug: string };
}

// Mock database fetch for service areas
async function getServiceArea(slug: string) {
  const serviceAreas = [
    {
      slug: 'pressure-washing-austin-tx',
      title: 'Expert Pressure Washing in Austin, TX',
      description: 'Top-rated pressure washing services in Austin. We remove black streaks, dirt, and grime from roofs, driveways, and siding.',
      service: 'Pressure Washing',
      location: 'Austin, TX',
    },
    {
      slug: 'roof-cleaning-dallas-tx',
      title: 'Professional Roof Cleaning in Dallas, TX',
      description: 'Safe and effective soft wash roof cleaning in Dallas. Protect your shingles and boost curb appeal.',
      service: 'Roof Cleaning',
      location: 'Dallas, TX',
    }
  ];
  return serviceAreas.find(area => area.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const serviceArea = await getServiceArea(params.slug);
  
  if (!serviceArea) {
    return {
      title: 'Service Not Found | TrendCast',
      description: 'The requested service area could not be found.'
    };
  }

  return {
    title: `${serviceArea.title} | TrendCast Home Services`,
    description: serviceArea.description,
    openGraph: {
      title: serviceArea.title,
      description: serviceArea.description,
      type: 'article',
    }
  };
}

export default async function ServiceAreaPage({ params }: Props) {
  const serviceArea = await getServiceArea(params.slug);

  if (!serviceArea) {
    notFound();
  }

  // Generate automated schema markup for LocalBusiness / Service
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `TrendCast ${serviceArea.service}`,
    description: serviceArea.description,
    address: {
      '@type': 'PostalAddress',
      addressLocality: serviceArea.location.split(',')[0],
      addressRegion: serviceArea.location.split(', ')[1] || '',
    },
    areaServed: {
      '@type': 'City',
      name: serviceArea.location.split(',')[0]
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 px-8 py-12 text-center text-white">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            {serviceArea.title}
          </h1>
          <p className="mt-4 text-xl font-medium text-blue-100">
            {serviceArea.description}
          </p>
        </div>
        
        <div className="px-8 py-8 md:p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Choose Our {serviceArea.service} in {serviceArea.location}?</h2>
          <div className="prose prose-blue max-w-none text-gray-600">
            <p>
              When it comes to maintaining your property in {serviceArea.location}, you need a reliable partner. 
              Our state-of-the-art {serviceArea.service.toLowerCase()} equipment and biodegradable solutions ensure 
              that your home not only looks stunning but is protected from long-term damage caused by mold, algae, and structural decay.
            </p>
            <ul className="mt-6 list-disc list-inside space-y-2">
              <li>Eco-friendly and property-safe cleaning solutions.</li>
              <li>Fully insured and trained technicians.</li>
              <li>Automated scheduling and upfront, transparent pricing.</li>
              <li>100% Satisfaction Guarantee.</li>
            </ul>
          </div>
          
          <div className="mt-10">
            <button className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:text-xl transition-colors shadow-lg hover:shadow-xl">
              Get an Instant Quote
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
