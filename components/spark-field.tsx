"use client";

const sparks = Array.from({ length: 44 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${12 + ((index * 53) % 78)}%`,
  delay: `${(index % 7) * 0.7}s`,
  duration: `${5 + (index % 5)}s`,
  size: `${4 + (index % 3)}px`,
}));

export function SparkField() {
  return (
    <div className="spark-field" aria-hidden="true">
      {sparks.map((spark) => (
        <i
          key={spark.id}
          style={{
            left: spark.left,
            top: spark.top,
            width: spark.size,
            height: spark.size,
            animationDelay: spark.delay,
            animationDuration: spark.duration,
          }}
        />
      ))}
    </div>
  );
}
