import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const TrafficSignalDiagram = () => {
  const svgRef = useRef(null);
  const [hoveredIntersection, setHoveredIntersection] = useState(null);

  const data = {
    intersections: [
      { id: 1, name: "Int 1", distance: 50, offset: 0 },
      { id: 2, name: "Int 2", distance: 150, offset: 5 },
      { id: 3, name: "Int 3", distance: 400, offset: 10 },
      { id: 4, name: "Int 4", distance: 600, offset: 15 },
      { id: 5, name: "Int 5", distance: 800, offset: 20 }
    ],
    cycleTime: 40,
    phases: [
      { type: 'green', duration: 15 },
      { type: 'yellow', duration: 5 },
      { type: 'red', duration: 20 }
    ],
    speed: 35 
  };

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Set up dimensions
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data.intersections, d => d.distance)])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, data.cycleTime])
      .range([height, 0]);

    // Add background grid
    const gridLines = svg.append('g')
      .attr('class', 'grid-lines')
      .style('opacity', 0.1);

    // Vertical grid lines
    data.intersections.forEach(intersection => {
      gridLines.append('line')
        .attr('x1', xScale(intersection.distance))
        .attr('x2', xScale(intersection.distance))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#999')
        .attr('stroke-dasharray', '2,2');
    });

    // Horizontal grid lines
    d3.range(0, data.cycleTime + 1, 5).forEach(time => {
      gridLines.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', yScale(time))
        .attr('y2', yScale(time))
        .attr('stroke', '#999')
        .attr('stroke-dasharray', '2,2');
    });

    // Function to determine phase at a given time
    const getPhaseAtTime = (time, offset) => {
      const adjustedTime = (time + offset) % data.cycleTime;
      let accumulated = 0;
      for (let phase of data.phases) {
        accumulated += phase.duration;
        if (adjustedTime < accumulated) return phase.type;
      }
      return data.phases[0].type;
    };

    // Create progression lines group
    const progressionGroup = svg.append('g')
      .attr('class', 'progression-lines');

    // Function to calculate progression line points
    const calculateProgressionLine = (startX, startY, endX, speed) => {
      const distance = endX - startX;
      const timeToTravel = distance / speed;
      const endY = (startY - timeToTravel + data.cycleTime) % data.cycleTime;
      return { x2: endX, y2: yScale(endY) };
    };

    // Update progression lines with animation
    const updateProgressionLines = (currentTime) => {
      progressionGroup.selectAll('*').remove();

      data.intersections.forEach((int1, idx) => {
        if (idx < data.intersections.length - 1) {
          const int2 = data.intersections[idx + 1];
          const currentPhase1 = getPhaseAtTime(currentTime, int1.offset);
          
          if (currentPhase1 === 'green') {
            const startY = (currentTime + int1.offset) % data.cycleTime;
            const end = calculateProgressionLine(
              int1.distance,
              startY,
              int2.distance,
              data.speed
            );

            progressionGroup.append('line')
              .attr('x1', xScale(int1.distance))
              .attr('y1', yScale(startY))
              .attr('x2', xScale(end.x2))
              .attr('y2', end.y2)
              .attr('stroke', '#ffffff')
              .attr('stroke-width', 2)
              .attr('stroke-dasharray', '4,4')
              .attr('opacity', 0.8);
          }
        }
      });
    };

    // Add signal bars with animation
    data.intersections.forEach(intersection => {
      const barWidth = 20;
      const x = xScale(intersection.distance) - barWidth/2;
      
      const numSegments = 20;
      const segmentHeight = height / numSegments;
      
      for (let i = 0; i < numSegments; i++) {
        const segmentGroup = svg.append('g')
          .attr('class', `signal-segment-${intersection.id}-${i}`);

        const updateSegment = () => {
          const baseTime = (Date.now() / 1000) % data.cycleTime;
          const segmentTime = (i * data.cycleTime / numSegments + baseTime) % data.cycleTime;
          const phase = getPhaseAtTime(segmentTime, intersection.offset);

          const colors = {
            green: '#15803d',
            yellow: '#ffff00',
            red: '#ff0000'
          };

          segmentGroup.selectAll('rect')
            .data([phase])
            .join('rect')
            .attr('x', x)
            .attr('y', yScale((i + 1) * data.cycleTime / numSegments))
            .attr('width', barWidth)
            .attr('height', segmentHeight + 1)
            .attr('fill', d => colors[d])
            .attr('opacity', 0.7)
            .on('mouseover', () => {
              setHoveredIntersection({
                name: intersection.name,
                phase: phase,
                time: Math.floor(segmentTime)
              });
            })
            .on('mouseout', () => {
              setHoveredIntersection(null);
            });
        };

        setInterval(updateSegment, 100);
      }
    });

    // Animate progression lines
    const animateProgressionLines = () => {
      const currentTime = (Date.now() / 1000) % data.cycleTime;
      updateProgressionLines(currentTime);
      requestAnimationFrame(animateProgressionLines);
    };

    animateProgressionLines();

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .append('text')
      .attr('x', width / 2)
      .attr('y', 35)
      .attr('fill', 'black')
      .text('Distance (meter)');

    svg.append('g')
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -height / 2)
      .attr('fill', 'black')
      .text('Time (seconds)');

  }, []);

  return (
    <div className="w-full max-w-4xl p-4 bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-white">Traffic Signal Coordination Diagram</h2>
      <svg ref={svgRef} className="w-full h-96 bg-gray-800"/>
      
      {hoveredIntersection && (
        <div className="mt-4 p-2 bg-gray-800 rounded text-white">
          <p className="font-semibold">{hoveredIntersection.name}</p>
          <p>Phase: <span className="capitalize">{hoveredIntersection.phase}</span></p>
          <p>Time: {hoveredIntersection.time}s</p>
        </div>
      )}

      <div className="mt-4 flex gap-4 text-white">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-700 mr-2"></div>
          <span>Green</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-400 mr-2"></div>
          <span>Yellow</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 mr-2"></div>
          <span>Red</span>
        </div>
      </div>
    </div>
  );
};

export default TrafficSignalDiagram;