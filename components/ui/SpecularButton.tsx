import { type ButtonHTMLAttributes, type CSSProperties, type MouseEventHandler, type ReactNode } from 'react';
import './SpecularButton.css';

interface SpecularButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick' | 'type' | 'disabled' | 'className'>
{
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  radius?: number;
  tint?: string;
  tintOpacity?: number;
  blur?: number;
  textColor?: string;
  /** Color of the specular streak on the rim */
  lineColor?: string;
  /** Darker stroke hugging the edge, gives the rim some thickness */
  baseColor?: string;
  /** 0–1, opacity of the streak */
  intensity?: number;
  /** Angular width of each streak, in degrees */
  shineSize?: number;
  /** Soft falloff on each side of the streak, in degrees */
  shineFade?: number;
  /** Rim thickness in px */
  thickness?: number;
  /** Sweep speed in rad/s (one full turn takes 2π / speed seconds) */
  speed?: number;
  /** Streak always on and sweeping; otherwise it only shows and moves on hover/focus */
  autoAnimate?: boolean;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Button with a specular streak sweeping around its rim.
 *
 * Pure CSS: a conic gradient on a rotating layer, clipped to a ring with a mask. The animation is a `transform` only, so it runs on
 * the compositor with no JavaScript, no canvas and no WebGL context (the previous version kept a second GPU context rendering every
 * frame next to ShapeWaves). Reduced motion keeps the streak static.
 */
const SpecularButton = ({
  children = 'Get Started',
  size = 'lg',
  radius = 18,
  tint = '#ffffff',
  tintOpacity = 0,
  blur = 0,
  textColor = '#f5f5f5',
  lineColor = '#ffffff',
  baseColor = '#525252',
  intensity = 1,
  shineSize = 10,
  shineFade = 40,
  thickness = 1,
  speed = 0.35,
  autoAnimate = false,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  ...rest
}: SpecularButtonProps) => (
  <button
    {...rest}
    type={type}
    disabled={disabled}
    onClick={onClick}
    className={`specular-button specular-button--${size}${autoAnimate ? ' specular-button--auto' : ''}${className ? ` ${className}` : ''}`}
    style={{
      '--sb-radius': `${radius}px`,
      '--sb-tint': tint,
      '--sb-tint-opacity': tintOpacity,
      '--sb-blur': `${blur}px`,
      '--sb-text-color': textColor,
      '--sb-line': lineColor,
      '--sb-base': baseColor,
      '--sb-intensity': intensity,
      '--sb-shine': `${shineSize / 2}deg`,
      '--sb-fade': `${shineFade / 2}deg`,
      '--sb-thickness': `${thickness}px`,
      '--sb-duration': `${(2 * Math.PI) / Math.max(speed, 0.01)}s`
    } as CSSProperties}
  >
    <span className="specular-button__fx" aria-hidden="true" />
    <span className="specular-button__label">{children}</span>
  </button>
);

export default SpecularButton;
