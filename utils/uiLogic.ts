
// Z-Index Layers
export const Z_INDEX = {
    TABLE_BACKGROUND: 0,
    TABLE_ZONES: 5,
    DECK: 10,
    TRUMP_CARD: 15,
    PLAYER_CARDS: 100, // Base layer for player hand
    OPPONENT_CARDS: 20,
    HOVERED_CARD: 300, // Significantly higher to ensure it pops over neighbors
    TRICK_CARDS: 50,
    PLAYER_AVATARS: 20,
    SCOREBOARD: 20,
    FLYING_CARD_ANIMATION: 400,
    TOASTS: 500,
    MODALS_BACKDROP: 600,
    MODALS_CONTENT: 700
};

// Fan Calculation Logic
export interface FanTransform {
  rotate: number;
  translateX: number;
  translateY: number;
  zIndex: number;
  transformOrigin: string;
}

/**
 * Calculates transform for a card in a fan layout using a radial pivot approach.
 * This simulates holding cards in a hand with a pivot point below the screen.
 */
export function calculateFanTransform(
  index: number, 
  total: number, 
  isOpponent: boolean = false,
  isMobile: boolean = false
): FanTransform {
  // If only one card, center it
  if (total <= 1) {
      return { 
          rotate: 0, 
          translateX: 0, 
          translateY: 0, 
          zIndex: 1, 
          transformOrigin: 'bottom center' 
      };
  }

  // --- Configuration ---
  // The angle (in degrees) between each card
  const anglePerCard = isMobile ? 5 : 4; 
  // The total spread of the hand
  const totalAngle = (total - 1) * anglePerCard;
  // The starting angle (leftmost card)
  const startAngle = -totalAngle / 2;
  
  // Radius of the imaginary circle the cards sit on
  const radius = isMobile ? 350 : 600; 

  // Calculate current card's angle relative to center (0)
  let angle = startAngle + (index * anglePerCard);

  // --- Calculation ---
  // Convert polar to cartesian offsets relative to the "top" of the circle (which is at y=0)
  // We want the circle center to be at (0, radius) below the cards
  
  // X = r * sin(theta)
  const translateX = radius * Math.sin(angle * (Math.PI / 180));
  
  // Y = r * (1 - cos(theta)) - this creates the arc/curve
  // We subtract this from the base Y position
  let translateY = radius * (1 - Math.cos(angle * (Math.PI / 180)));

  // Add extra spacing spread for visual clarity (linear x push)
  const linearSpread = isMobile ? 18 : 25;
  const centerIndex = (total - 1) / 2;
  const offset = index - centerIndex;
  
  // Combine radial X with linear X for better card visibility (less overlap than pure circle)
  const finalX = translateX + (offset * (isMobile ? 2 : 5));
  
  // Adjust Y to push cards slightly down if they are on the edges (parabola boost)
  // This compensates for the radial calculation sometimes being too subtle
  const yBoost = Math.abs(offset) * (isMobile ? 1 : 2);
  let finalY = translateY + yBoost;

  // Rotation is simply the angle
  let rotate = angle;

  // --- Opponent Inversion ---
  if (isOpponent) {
      // Flip everything for top-of-screen rendering
      rotate = -rotate; // Mirror rotation
      finalY = -finalY * 0.8; // Flatten the arc slightly for opponent
      // No X inversion needed as indices naturally go left-to-right, 
      // but usually opponent hand is sorted right-to-left visually? 
      // Standard game logic sorts hand, so we just display index 0 at left.
  }

  return {
    rotate: rotate, 
    translateX: finalX,
    translateY: finalY, 
    zIndex: index + 1,
    transformOrigin: isOpponent ? 'top center' : 'bottom center' // Pivot point
  };
}
