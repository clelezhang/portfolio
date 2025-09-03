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
        '/work-images/pearl-1.webp',
        '/work-images/pearl-2.webp',
        '/work-images/pearl-3.webp'
      ],
      terrakaffe: [
        '/work-images/tk-1.webp',
        '/work-images/tk-2.webp',
        '/work-images/tk-3.webp'
      ], 
      fragile: [
        '/work-images/fragile-1.webp',
        '/work-images/fragile-2.webp',
        '/work-images/fragile-3.webp'
      ],
      auracam: [
        '/work-images/auracam-1.webp',
        '/work-images/auracam-2.webp'
      ],
      whim: [
        '/work-images/whim-1.webp',
        '/work-images/whim-2.webp',
      ],
      latch: [
        '/work-images/latch-1.webp',
        '/work-images/latch-2.webp'
      ]
    };
    return imageMap[workId] || ['/card-images/apps.jpg'];
  };

  return (
    <section className="py-4 px-6" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <div className="mb-20">
          <div className="flex flex-wrap items-center text-sm font-detail">
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
                {index < categories.length - 1 && <span className="mx-1 text-gray-400">•</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Work Projects */}
        <div className="space-y-20">
          {workExperience.map((work) => (
            <div key={work.id} className="group">
              {/* Project Title */}
              <h3 className="text-base mb-2 font-sans text-gray-500">
                {work.title}
              </h3>
              
              {/* Project Description */}
                <p 
                  className="text-base leading-normal mb-4 font-detail text-gray-700"
                  dangerouslySetInnerHTML={{ __html: work.description }}
                />

              {/* Project Images - Custom Layout per Project */}
              {work.id === 'pearl' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 h-[600px]">
                  <div className="md:col-span-2">
                    <div className="bg-gray-50 rounded-lg overflow-hidden h-full">
                      <div className="w-full h-full relative">
                        <Image src={getWorkImages(work.id)[0]} alt={`${work.title} - Main`} fill className="object-contain" draggable={false} style={{ transform: 'scale(0.85)' }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="rounded-lg overflow-hidden border border-gray-50 flex-1">
                      <div className="w-full h-full relative">
                        <Image src={getWorkImages(work.id)[1]} alt={`${work.title} - Stats`} fill className="object-cover" draggable={false} />
                      </div>
                    </div>
                    <div className="rounded-lg overflow-hidden border border-gray-50 flex-1">
                      <div className="w-full h-full relative">
                        <Image src={getWorkImages(work.id)[2]} alt={`${work.title} - Reflection`} fill className="object-cover" draggable={false} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {work.id === 'terrakaffe' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-[600px]">
                  <div className="bg-gray-50 rounded-lg overflow-hidden h-full">
                    <div className="w-full h-full relative">
                      <Image src={getWorkImages(work.id)[0]} alt={`${work.title} - Product`} fill className="object-contain" draggable={false} style={{ transform: 'scale(0.85)' }} />
                    </div>
                  </div>
                  <div className="flex flex-row gap-2">
                    <div className="rounded-lg overflow-hidden flex-1">
                      <div className="h-full relative" style={{ aspectRatio: '9/16' }}>
                        <Image src={getWorkImages(work.id)[1]} alt={`${work.title} - Marketing`} fill className="object-cover" draggable={false} />
                      </div>
                    </div>
                    <div className="rounded-lg overflow-hidden flex-1">
                      <div className="h-full relative" style={{ aspectRatio: '9/16' }}>
                        <Image src={getWorkImages(work.id)[2]} alt={`${work.title} - Coffee`} fill className="object-cover" draggable={false} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {work.id === 'fragile' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-[600px]">
                  <div className="bg-gray-50 rounded-lg overflow-hidden h-full">
                    <div className="w-full h-full relative">
                                              <Image src={getWorkImages(work.id)[0]} alt={`${work.title} - Checkout`} fill className="object-contain" draggable={false} style={{ transform: 'scale(0.85)' }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="bg-black rounded-lg overflow-hidden flex-1">
                      <div className="w-full h-full relative">
                        <Image src={getWorkImages(work.id)[1]} alt={`${work.title} - Presentation`} fill className="object-contain" draggable={false} style={{ transform: 'scale(0.9)' }} />
                      </div>
                    </div>
                    <div className="bg-black rounded-lg overflow-hidden flex-1">
                      <div className="w-full h-full relative">
                        <Image src={getWorkImages(work.id)[2]} alt={`${work.title} - Branding`} fill className="object-contain" draggable={false} style={{ transform: 'scale(0.8)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {work.id === 'auracam' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-[600px]">
                  <div className="rounded-lg overflow-hidden h-full">
                    <div className="w-full h-full relative">
                      <Image src={getWorkImages(work.id)[0]} alt={`${work.title} - Auracam`} fill className="object-cover" draggable={false} />
                    </div>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-gray-50 h-full">
                    <div className="w-full h-full relative">
                      <Image src={getWorkImages(work.id)[1]} alt={`${work.title} - Mosaic`} fill className="object-contain" draggable={false} style={{ transform: 'scale(0.85)' }} />
                    </div>
                  </div>
                </div>
              )}

              {work.id === 'whim' && (
                <div className="flex flex-row gap-2 h-[600px]">
                  <div className="bg-black rounded-lg overflow-hidden h-full flex-1">
                    <div className="w-full h-full relative">
                                              <Image src={getWorkImages(work.id)[0]} alt={`${work.title} - Landing`} fill className="object-contain" draggable={false} style={{ transform: 'scale(0.85)' }} />
                    </div>
                  </div>
                  <div className="rounded-lg overflow-hidden">
                    <div className="bg-white h-full relative" style={{ aspectRatio: '9/16' }}>
                      <Image src={getWorkImages(work.id)[1]} alt={`${work.title} - Sleep`} fill className="object-cover" draggable={false} />
                    </div>
                  </div>
                </div>
              )}

              {work.id === 'latch' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-[600px]">
                  <div className="bg-gray-50 rounded-lg overflow-hidden h-full">
                    <div className="w-full h-full relative">
                      <Image src={getWorkImages(work.id)[0]} alt={`${work.title} - Data Sync`} fill className="object-contain" draggable={false} style={{ transform: 'scale(0.85)' }} />
                    </div>
                  </div>
                  <div className="rounded-lg overflow-hidden h-full">
                    <div className="bg-gray-50 w-full h-full relative">
                      <Image src={getWorkImages(work.id)[1]} alt={`${work.title} - Case Study`} fill className="object-cover" draggable={false} />
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
