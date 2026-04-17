"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageIcon, Trash2, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import * as React from "react";
import { toast } from "sonner";

/**
 * ImageUpload Props
 */
interface ImageUploadProps {
  value?: string | null;
  onChange?: (url: string | null) => void;
  onFileSelect?: (file: File) => void;
  placeholder?: string;
  aspectRatio?: "square" | "video" | "wide";
  maxSize?: number; // MB
  accept?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * 이미지 업로드 컴포넌트 (드래그 & 드롭 지원)
 * 레퍼런스: Add Products 페이지의 이미지 업로드 영역
 */
export function ImageUpload({
  value,
  onChange,
  onFileSelect,
  placeholder,
  aspectRatio = "square",
  maxSize = 5, // 5MB default
  accept = "image/*",
  disabled = false,
  className,
}: ImageUploadProps) {
  const t = useTranslations("imageUpload");
  const resolvedPlaceholder = placeholder ?? t("placeholder");
  const [isDragging, setIsDragging] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(
    value || null
  );
  const inputRef = React.useRef<HTMLInputElement>(null);

  // value 변경 시 previewUrl 업데이트
  React.useEffect(() => {
    setPreviewUrl(value || null);
  }, [value]);

  const aspectRatioClasses = {
    square: "aspect-square",
    video: "aspect-video",
    wide: "aspect-[2/1]",
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input value so the same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFile = (file: File) => {
    // 파일 크기 검사
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(t("fileSizeError", { maxSize }));
      return;
    }

    // 파일 타입 검사
    if (!file.type.startsWith("image/")) {
      toast.error(t("fileTypeError"));
      return;
    }

    // 파일 선택 콜백
    onFileSelect?.(file);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setPreviewUrl(url);
      onChange?.(url);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    onChange?.(null);
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
          aspectRatioClasses[aspectRatio],
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer",
          previewUrl && "border-solid"
        )}
      >
        {previewUrl ? (
          <>
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="rounded-lg object-cover"
            />
            {!disabled && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleClick}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t("change")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("delete")}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="bg-muted rounded-full p-3">
              <ImageIcon className="text-muted-foreground h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{resolvedPlaceholder}</p>
              <p className="text-muted-foreground text-xs">
                {t("formatHint", { maxSize })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * MultiImageUpload Props
 */
interface MultiImageUploadProps {
  values?: string[];
  onChange?: (urls: string[]) => void;
  onFileSelect?: (file: File, index: number) => void;
  maxImages?: number;
  aspectRatio?: "square" | "video" | "wide";
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * 다중 이미지 업로드 컴포넌트
 */
export function MultiImageUpload({
  values = [],
  onChange,
  onFileSelect,
  maxImages = 4,
  aspectRatio = "square",
  maxSize = 5,
  disabled = false,
  className,
}: MultiImageUploadProps) {
  const t = useTranslations("imageUpload");
  const handleImageChange = (index: number, url: string | null) => {
    if (url === null) {
      // 삭제
      const newValues = values.filter((_, i) => i !== index);
      onChange?.(newValues);
    } else {
      // 수정
      const newValues = [...values];
      newValues[index] = url;
      onChange?.(newValues);
    }
  };

  const handleAddImage = (url: string) => {
    if (values.length < maxImages) {
      onChange?.([...values, url]);
    }
  };

  const aspectRatioClasses = {
    square: "aspect-square",
    video: "aspect-video",
    wide: "aspect-[2/1]",
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* 메인 이미지 */}
      <ImageUpload
        value={values[0] || null}
        onChange={(url) => {
          if (url) {
            if (values.length === 0) {
              handleAddImage(url);
            } else {
              handleImageChange(0, url);
            }
          } else {
            handleImageChange(0, null);
          }
        }}
        onFileSelect={(file) => onFileSelect?.(file, 0)}
        aspectRatio={aspectRatio}
        maxSize={maxSize}
        disabled={disabled}
        placeholder={t("mainImage")}
      />

      {/* 추가 이미지 그리드 */}
      {values.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {/* 기존 이미지들 */}
          {values.slice(1).map((url, index) => (
            <div
              key={index}
              className={cn(
                "relative overflow-hidden rounded-md border",
                aspectRatioClasses[aspectRatio]
              )}
            >
              <Image
                src={url}
                alt={`Image ${index + 2}`}
                fill
                className="object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleImageChange(index + 1, null)}
                  className="bg-destructive text-destructive-foreground absolute top-1 right-1 rounded-full p-1 opacity-0 transition-opacity hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          {/* 추가 버튼 */}
          {values.length < maxImages && !disabled && (
            <ImageUpload
              onChange={(url) => url && handleAddImage(url)}
              onFileSelect={(file) => onFileSelect?.(file, values.length)}
              aspectRatio={aspectRatio}
              maxSize={maxSize}
              disabled={disabled}
              placeholder="+"
              className="min-h-[80px]"
            />
          )}
        </div>
      )}
    </div>
  );
}
