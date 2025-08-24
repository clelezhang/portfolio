
interface ProjectCard {
  id: number;
  title: string;
  description: string;
  image: string;
  tags: string[];
  size: 'small' | 'medium' | 'large';
}

const portfolioItems: ProjectCard[] = [
  {
    id: 1,
    title: "Design System",
    description: "A comprehensive design system for product consistency",
    image: "/placeholder-1.jpg",
    tags: ["Design", "System"],
    size: "medium"
  },
  {
    id: 2,
    title: "Mobile App",
    description: "iOS app for productivity and wellness",
    image: "/placeholder-2.jpg",
    tags: ["Mobile", "UI/UX"],
    size: "small"
  },
  {
    id: 3,
    title: "Web Platform",
    description: "B2B platform for team collaboration",
    image: "/placeholder-3.jpg",
    tags: ["Web", "Platform"],
    size: "large"
  },
  {
    id: 4,
    title: "Brand Identity",
    description: "Complete brand refresh for startup",
    image: "/placeholder-4.jpg",
    tags: ["Branding", "Identity"],
    size: "medium"
  },
  {
    id: 5,
    title: "Data Visualization",
    description: "Interactive dashboards for analytics",
    image: "/placeholder-5.jpg",
    tags: ["Data", "Visualization"],
    size: "small"
  },
  {
    id: 6,
    title: "E-commerce",
    description: "Online store redesign and optimization",
    image: "/placeholder-6.jpg",
    tags: ["E-commerce", "UX"],
    size: "medium"
  }
];

export default function PortfolioGrid() {
  const getGridClasses = (size: string) => {
    switch (size) {
      case 'large':
        return 'md:col-span-2 md:row-span-2';
      case 'medium':
        return 'md:col-span-1 md:row-span-1';
      case 'small':
        return 'md:col-span-1 md:row-span-1';
      default:
        return 'md:col-span-1 md:row-span-1';
    }
  };

  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
          {portfolioItems.map((item) => (
            <div
              key={item.id}
              className={`relative overflow-hidden rounded-lg bg-gray-100 ${getGridClasses(item.size)}`}
            >
              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <div className="text-gray-500 text-center font-sans">
                  <div className="w-16 h-16 bg-gray-400 rounded-lg mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">{item.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}