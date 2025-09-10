'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getWorkExperience } from '../lib/prompts';

export default function WorkSection() {
  const [activeCategory, setActiveCategory] = useState('my work');
  const workExperience = getWorkExperience();

  const categories = ['my work', 'product', 'frontend', 'brand', 'visuals'];

  // Filter work experience based on active category
  const filteredWork = activeCategory === 'my work' 
    ? workExperience 
    : workExperience.filter(work => 
        work.categories.includes(activeCategory as 'product' | 'frontend' | 'brand' | 'visuals')
      );

  // Map work projects to their multiple images
  const getWorkImages = (workId: string) => {
    const imageMap: { [key: string]: string[] } = {
      pearl: [
        '/work-images/pearl-1.webp',
        '/work-images/pearl-4.webp',
        '/work-images/pearl-5.webp'
      ],
      fragile: [
        '/work-images/fragile-1.webp',
        '/work-images/fragile-2.webp',
        '/work-images/fragile-3.webp'
      ],
      terrakaffe: [
        '/work-images/tk-1.webp',
        '/work-images/tk-2.webp',
        '/work-images/tk-3.webp'
      ], 
      auracam: [
        '/work-images/auracam-1.webp',
        '/work-images/auracam-3.webp'
      ],
      // whim: [
      //   '/work-images/whim-1.webp',
      //   '/work-images/whim-2.webp',
      // ],
      latch: [
        '/work-images/latch-1.webp',
        '/work-images/latch-3.webp'
      ]
    };
    return imageMap[workId] || ['/card-images/apps.jpg'];
  };

  // Map work projects to their links
  const getProjectLinks = (workId: string) => {
    const linkMap: { [key: string]: { url?: string; titleLink?: boolean; imageLinks?: boolean[] } } = {
      pearl: {
        url: 'https://info.writewithprl.com/',
        titleLink: true,
        imageLinks: [true, true, true] // All images link
      },
      fragile: {
        url: 'https://flex.terrakaffe.com/terra-kaffe/checkout?products=tk-02(color%3Dwhite)&_gl=1*f6ybc6*_gcl_aw*R0NMLjE3NTIwMjIwMjkuQ2p3S0NBandnN1BEQmhCeEVpd0FmMUNWdXo1RDlaOXRNTVhlM1ZVaDRtZ0dyS2N0VzZIcUxXSWxDMklDc25wTkxCUkFyMG0xSExxYVNCb0NydFFRQXZEX0J3RQ..*_gcl_au*MTc0NjYxMjk3My4xNzUwODc2NTEy',
        titleLink: false,
        imageLinks: [true, false, false] // Only first image links
      },
      terrakaffe: {
        url: 'https://www.terrakaffe.com/products/tk-02?rent=1',
        titleLink: true,
        imageLinks: [true, true, true] // All images link
      },
      auracam: {
        url: 'https://auracam.onrender.com/',
        titleLink: true,
        imageLinks: [true, false] // Only first image links
      },
      latch: {
        url: 'https://latch.bio/',
        titleLink: true,
        imageLinks: [true, true] // Both images link
      }
    };
    return linkMap[workId] || {};
  };

  // Helper function to check if an image should be linked
  const shouldLinkImage = (workId: string, imageIndex: number): string | null => {
    const links = getProjectLinks(workId);
    if (links.imageLinks && links.imageLinks[imageIndex] && links.url) {
      return links.url;
    }
    return null;
  };

  // Reusable ImageContainer component
  const ImageContainer = ({ 
    workId, 
    imageIndex, 
    className, 
    imageClassName, 
    containerClassName = "work-image-container-4-3",
    alt, 
    sizes 
  }: {
    workId: string;
    imageIndex: number;
    className: string;
    imageClassName: string;
    containerClassName?: string;
    alt: string;
    sizes: string;
  }) => {
    const linkUrl = shouldLinkImage(workId, imageIndex);
    const imageElement = (
      <div className={`w-full relative ${containerClassName}`}>
        <Image 
          src={getWorkImages(workId)[imageIndex]} 
          alt={alt} 
          fill 
          className={imageClassName} 
          draggable={false} 
          sizes={sizes} 
        />
      </div>
    );

    if (linkUrl) {
      return (
        <Link href={linkUrl} target="_blank" rel="noopener noreferrer" className={`${className} cursor-pointer`}>
          {imageElement}
        </Link>
      );
    }

    return <div className={className}>{imageElement}</div>;
  };

  return (
    <section id="portfolio-grid" className="py-4 px-4 bg-lightgray">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <div className="mb-20">
          <div className="flex flex-row">
            {categories.map((category, index) => (
              <span key={category}>
                <button
                  onClick={() => setActiveCategory(category)}
                  className={`hover:text-gray-800 transition-colors lowercase ${
                    activeCategory === category ? 'text-gray-800' : 'text-gray-500'
                  }`}
                >
                  {category}
                </button>
                {index < categories.length - 1 && <span className="mx-2 text-gray-400">•</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Work Projects */}
        <div className="space-y-20">
          {filteredWork.map((work) => (
            <div key={work.id} className="group">
              {/* Project Title */}
              <h3 className="text-base mb-2 font-sans text-gray-500">
                {getProjectLinks(work.id).titleLink && getProjectLinks(work.id).url ? (
                  <Link 
                    href={getProjectLinks(work.id).url!} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate transition-colors"
                  >
                    {work.title}
                  </Link>
                ) : (
                  work.title
                )}
              </h3>
              
              {/* Project Description */}
                <p 
                  className="text-base leading-normal mb-4 font-detail text-gray-700"
                  dangerouslySetInnerHTML={{ __html: work.description }}
                />

              {/* Project Images - Custom Layout per Project */}
              {work.id === 'pearl' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <ImageContainer
                    workId={work.id}
                    imageIndex={0}
                    className="md:col-span-8 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center"
                    imageClassName="object-contain work-image-scale-85"
                    alt={`${work.title} - Main`}
                    sizes="(max-width: 768px) 100vw, 66vw"
                  />
                  <div className="md:col-span-4 flex flex-row md:flex-col gap-2">
                    <ImageContainer
                      workId={work.id}
                      imageIndex={1}
                      className="rounded-lg overflow-hidden border border-gray-50 flex-1"
                      imageClassName="object-cover"
                      alt={`${work.title} - Stats`}
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                    <ImageContainer
                      workId={work.id}
                      imageIndex={2}
                      className="rounded-lg overflow-hidden border border-gray-50 flex-1"
                      imageClassName="object-cover"
                      alt={`${work.title} - Reflection`}
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                </div>
              )}


              {work.id === 'fragile' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <ImageContainer
                    workId={work.id}
                    imageIndex={0}
                    className="md:col-span-7 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center"
                    imageClassName="object-contain work-image-scale-85"
                    alt={`${work.title} - Checkout`}
                    sizes="(max-width: 768px) 100vw, 58vw"
                  />
                  <div className="md:col-span-5 flex flex-row md:flex-col sm:flex-row gap-2">
                    <ImageContainer
                      workId={work.id}
                      imageIndex={1}
                      className="bg-black rounded-lg overflow-hidden flex items-center justify-center flex-1"
                      imageClassName="object-contain work-image-scale-90"
                      containerClassName="work-image-container-16-9"
                      alt={`${work.title} - Presentation`}
                      sizes="(max-width: 768px) 50vw, 42vw"
                    />
                    <ImageContainer
                      workId={work.id}
                      imageIndex={2}
                      className="bg-black rounded-lg overflow-hidden flex items-center justify-center flex-1"
                      imageClassName="object-contain work-image-scale-80"
                      containerClassName="work-image-container-16-9"
                      alt={`${work.title} - Branding`}
                      sizes="(max-width: 768px) 50vw, 42vw"
                    />
                  </div>
                </div>
              )}

              {work.id === 'terrakaffe' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <ImageContainer
                    workId={work.id}
                    imageIndex={0}
                    className="md:col-span-6 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center"
                    imageClassName="object-contain work-image-scale-85"
                    alt={`${work.title} - Product`}
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="md:col-span-6 flex flex-row gap-2">
                    <ImageContainer
                      workId={work.id}
                      imageIndex={1}
                      className="rounded-lg overflow-hidden flex-1"
                      imageClassName="object-cover"
                      containerClassName="work-image-container-9-16"
                      alt={`${work.title} - Marketing`}
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    <ImageContainer
                      workId={work.id}
                      imageIndex={2}
                      className="rounded-lg overflow-hidden flex-1"
                      imageClassName="object-cover"
                      containerClassName="work-image-container-9-16"
                      alt={`${work.title} - Coffee`}
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </div>
                </div>
              )}

              {work.id === 'auracam' && (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <ImageContainer
                    workId={work.id}
                    imageIndex={0}
                    className="sm:col-span-6 rounded-lg overflow-hidden"
                    imageClassName="object-cover"
                    containerClassName="work-image-container-1-1"
                    alt={`${work.title} - Auracam`}
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  <ImageContainer
                    workId={work.id}
                    imageIndex={1}
                    className="bg-white sm:col-span-6 rounded-lg overflow-hidden border border-gray-50 flex items-center justify-center"
                    imageClassName="object-contain work-image-scale-85"
                    containerClassName="work-image-container-1-1"
                    alt={`${work.title} - Mosaic`}
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </div>
              )}

              {work.id === 'whim' && (
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-9 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                    <div className="w-full relative work-image-container-16-9">
                      <Image src={getWorkImages(work.id)[0]} alt={`${work.title} - Landing`} fill className="object-contain work-image-scale-80" draggable={false} sizes="75vw" />
                    </div>
                  </div>
                  <div className="col-span-3 rounded-lg overflow-hidden">
                    <div className="w-full relative work-image-container-9-16">
                      <Image src={getWorkImages(work.id)[1]} alt={`${work.title} - Sleep`} fill className="object-cover" draggable={false} sizes="25vw" />
                    </div>
                  </div>
                </div>
              )}

              {work.id === 'latch' && (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <ImageContainer
                    workId={work.id}
                    imageIndex={0}
                    className="sm:col-span-6 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center"
                    imageClassName="object-contain work-image-scale-85"
                    containerClassName="work-image-container-1-1"
                    alt={`${work.title} - Data Sync`}
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  <ImageContainer
                    workId={work.id}
                    imageIndex={1}
                    className="sm:col-span-6 rounded-lg overflow-hidden"
                    imageClassName="object-cover"
                    containerClassName="bg-gray-50 w-full relative work-image-container-1-1"
                    alt={`${work.title} - Case Study`}
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
