## Build and run

- `npm run build:demo`
- `npx serve dist`
  - Navigate to http://localhost:3000/demo.html

## Demo features

- Spawns up to 100 entities with random components
- All entities have Position, Velocity, Size, Color, and Lifetime
- Some entities randomly get Spinning and/or Pulsing effects
- Entities move around and bounce off walls
- Entities fade out and are deleted when their lifetime expires
- New entities spawn continuously (5 per second)
- Displays real-time: FPS, Entity count, Component count, Frame number
