import type { ReactNode } from "react";
import { Img, Section, Text } from "react-email";

export function DetailCard({
  label,
  title,
  image,
  children,
}: {
  label: string;
  title?: string;
  image?: string;
  children?: ReactNode;
}) {
  return (
    <Section className="mt-2 mb-7 rounded-hard border border-solid border-operational-border p-6 text-center font-ui">
      {image && (
        <Img
          src={image}
          alt={title ?? label}
          width={200}
          height={140}
          className="mx-auto mb-5 block max-w-full rounded-medium object-contain"
        />
      )}
      <Text className="m-0 mb-2.5 text-[11px] font-semi-bold tracking-[1px] text-gray uppercase">
        {label}
      </Text>
      {title && (
        <Text className="m-0 mb-3 text-lg leading-[26px] font-semi-bold text-black">
          {title}
        </Text>
      )}
      {children}
    </Section>
  );
}
