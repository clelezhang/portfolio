'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getWorkExperience } from '../lib/prompts';

export default function WorkSection() {
  const [activeCategory, setActiveCategory] = useState('my work');
  const workExperience = getWorkExperience();

  const categories = ['my work', 'product', 'frontend', 'brand', 'visuals'];

  // Map work projects to their multiple images
  const getWorkImages = (workId: string) => {
    const imageMap: { [key: string]: string[] } = {
      pearl: [
        '/work-images/pearl-journal-1.jpg',
        '/work-images/pearl-journal-2.jpg',
        '/work-images/pearl-journal-3.jpg'
      ],
      terrakaffe: [
        '/work-images/terrakaffe-1.jpg',
        '/work-images/terrakaffe-2.jpg',
        '/work-images/terrakaffe-3.jpg'
      ], 
      fragile: [
        '/work-images/fragile-1.jpg',
        '/work-images/fragile-2.jpg',
        '/work-images/fragile-3.jpg'
      ],
      auracam: [
        '/work-images/auracam-1.jpg',
        '/work-images/auracam-2.jpg'
      ],
      whim: [
        '/work-images/whim-1.jpg',
        '/work-images/whim-2.jpg',
        '/work-images/whim-3.jpg'
      ],
      latch: [
        '/work-images/latch-1.jpg',
        '/work-images/latch-2.jpg'
      ]
    };
    return imageMap[workId] || ['/card-images/apps.jpg'];
  };

  return (
    <section className="py-4 px-6" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <div className="mb-16">
          <div className="flex flex-wrap items-center text-sm font-detail">
            {categories.map((category, index) => (
              <span key={category}>
                <button
                  onClick={() => setActiveCategory(category)}
                  className={`hover:text-grey-800 transition-colors lowercase ${
                    activeCategory === category ? 'text-grey-800' : 'text-grey-600'
                  }`}
                >
                  {category}
                </button>
                {index < categories.length - 1 && <span className="mx-1 text-grey-400">•</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Work Projects */}
        <div className="space-y-24">
          {workExperience.map((work) => (
            <div key={work.id} className="group">
              {/* Project Title */}
              <h3 className="text-2xl md:text-3xl font-medium mb-6 font-sans text-grey-800 lowercase">
                {work.title}
              </h3>
              
              {/* Project Description */}
              <p className="text-base md:text-lg leading-relaxed mb-12 max-w-4xl font-detail text-grey-700">
                {work.description}
              </p>

              {/* Project Images - Custom Layout per Project */}
              {work.id === 'pearl' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
                  <div className="md:col-span-2">
                    <div className="bg-white rounded-lg overflow-hidden shadow-sm h-full">
                      <div className="w-full h-full relative">
                        <Image src={getWorkImages(work.id)[0]} alt={`${work.title} - Main`} fill className="object-cover" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-lg overflow-hidden shadow-sm flex-1">
                      <div className="w-full h-full relative">
                        <Image src={getWorkImages(work.id)[1]} alt={`${work.title} - Stats`} fill className="object-cover" />
                      </div>
                    </div>
                    <div className="bg-white rounded-lg overflow-hidden shadow-sm flex-1">
                      <div className="w-full h-full relative">
                        <Image src={getWorkImages(work.id)[2]} alt={`${work.title} - Reflection`} fill className="object-cover" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {work.id === 'terrakaffe' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px]">
                  <div className="bg-white rounded-lg overflow-hidden shadow-sm h-full">
                    <div className="w-full h-full relative">
                      <Image src={getWorkImages(work.id)[0]} alt={`${work.title} - Product`} fill className="object-cover" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-lg overflow-hidden shadow-sm flex-1">
                      <div className="w-full h-full relative">
                        <Image src={getWorkImages(work.id)[1]} alt={`${work.title} - Marketing`} fill className="object-cover" />
                      </div>
                    </div>
                    <div className="bg-white rounded-lg overflow-hidden shadow-sm flex-1">
                      <div className="w-full h-full relative">
                        <Image src={getWorkImages(work.id)[2]} alt={`${work.title} - Coffee`} fill className="object-cover" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {work.id === 'fragile' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px]">
                  <div className="bg-white rounded-lg overflow-hidden shadow-sm h-full">
                    <div className="w-full h-full relative">
                      <Image src={getWorkImages(work.id)[0]} alt={`${work.title} - Checkout`} fill className="object-cover" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-lg overflow-hidden shadow-sm flex-1">
                      <div className="w-full h-full relative">
                        <Image src={getWorkImages(work.id)[1]} alt={`${work.title} - Presentation`} fill className="object-cover" />
                      </div>
                    </div>
                    <div className="bg-white rounded-lg overflow-hidden shadow-sm flex-1">
                      <div className="w-full h-full relative">
                        <Image src={getWorkImages(work.id)[2]} alt={`${work.title} - Branding`} fill className="object-cover" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {work.id === 'auracam' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px]">
                  <div className="bg-white rounded-lg overflow-hidden shadow-sm h-full">
                    <div className="w-full h-full relative">
                      <Image src={getWorkImages(work.id)[0]} alt={`${work.title} - Auracam`} fill className="object-cover" />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg overflow-hidden shadow-sm h-full">
                    <div className="w-full h-full relative">
                      <Image src={getWorkImages(work.id)[1]} alt={`${work.title} - Mosaic`} fill className="object-cover" />
                    </div>
                  </div>
                </div>
              )}

              {work.id === 'whim' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
                  <div className="md:col-span-2">
                    <div className="bg-white rounded-lg overflow-hidden shadow-sm h-full">
                      <div className="w-full h-full relative">
                        <Image src={getWorkImages(work.id)[0]} alt={`${work.title} - Landing`} fill className="object-cover" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-lg overflow-hidden shadow-sm flex-1">
                      <div className="w-full h-full relative">
                        <Image src={getWorkImages(work.id)[1]} alt={`${work.title} - Sleep`} fill className="object-cover" />
                      </div>
                    </div>
                    <div className="bg-white rounded-lg overflow-hidden shadow-sm flex-1">
                      <div className="w-full h-full relative">
                        <Image src={getWorkImages(work.id)[2]} alt={`${work.title} - Catalog`} fill className="object-cover" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {work.id === 'latch' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px]">
                  <div className="bg-white rounded-lg overflow-hidden shadow-sm h-full">
                    <div className="w-full h-full relative">
                      <Image src={getWorkImages(work.id)[0]} alt={`${work.title} - Data Sync`} fill className="object-cover" />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg overflow-hidden shadow-sm h-full">
                    <div className="w-full h-full relative">
                      <Image src={getWorkImages(work.id)[1]} alt={`${work.title} - Case Study`} fill className="object-cover" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
