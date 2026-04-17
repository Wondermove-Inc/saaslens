"use client";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

/**
 * Displays a menu to the user — such as a set of actions or functions —
 * triggered by a button.
 */
const meta = {
  title: "ui/ContextMenu",
  component: ContextMenu,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  excludeStories: /.*Demo$/,
  argTypes: {
    modal: {
      control: "boolean",
      description:
        "Whether the context menu should be modal (blocking interaction with the rest of the page)",
    },
  },
  args: {
    modal: true,
  },
  render: (args) => (
    <ContextMenu modal={args.modal}>
      <ContextMenuTrigger className="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm">
        Right click here
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem inset>
          Back
          <ContextMenuShortcut>⌘[</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset disabled>
          Forward
          <ContextMenuShortcut>⌘]</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset>
          Reload
          <ContextMenuShortcut>⌘R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>More Tools</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuItem>Save Page...</ContextMenuItem>
            <ContextMenuItem>Create Shortcut...</ContextMenuItem>
            <ContextMenuItem>Name Window...</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>Developer Tools</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked>
          Show Bookmarks
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem>Show Full URLs</ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup value="pedro">
          <ContextMenuLabel inset>People</ContextMenuLabel>
          <ContextMenuRadioItem value="pedro">
            Pedro Duarte
          </ContextMenuRadioItem>
          <ContextMenuRadioItem value="colm">Colm Tuite</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  ),
} satisfies Meta<typeof ContextMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the context menu with all features.
 */
export const Default: Story = {};

export const ShouldOpenContextMenu: Story = {
  name: "when right click on trigger, should open context menu",
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: Context Menu가 우클릭으로 열리고, 메뉴 아이템 선택이 가능한지 확인
    const trigger = canvas.getByText(/right click here/i);
    await expect(trigger).toBeInTheDocument();

    // 트리거에 우클릭하여 컨텍스트 메뉴 열기
    await userEvent.pointer([
      { target: trigger },
      { keys: "[MouseRight]", target: trigger },
    ]);

    // 메뉴가 열렸는지 확인 (메뉴 아이템 확인)
    await waitFor(async () => {
      const backItem = await canvas.findByRole("menuitem", {
        name: /back/i,
      });
      await expect(backItem).toBeInTheDocument();
    });

    // 다른 메뉴 아이템들도 확인
    const reloadItem = canvas.getByRole("menuitem", { name: /reload/i });
    await expect(reloadItem).toBeInTheDocument();

    // 메뉴 아이템 클릭
    await userEvent.click(reloadItem);
  },
};

export const ShouldOpenSubmenuAndToggleItems: Story = {
  name: "when hovering submenu trigger, should open submenu and toggle checkbox items",
  tags: ["!dev", "!autodocs"],
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger
        className="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm"
        data-testid="context-trigger"
      >
        Right click here
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem data-testid="back-item">Back</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger data-testid="submenu-trigger">
            More Tools
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuItem data-testid="save-page-item">
              Save Page...
            </ContextMenuItem>
            <ContextMenuItem data-testid="developer-tools-item">
              Developer Tools
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem
          data-testid="bookmarks-checkbox"
          defaultChecked
        >
          Show Bookmarks
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem data-testid="urls-checkbox">
          Show Full URLs
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup value="pedro">
          <ContextMenuLabel>People</ContextMenuLabel>
          <ContextMenuRadioItem value="pedro" data-testid="pedro-radio">
            Pedro Duarte
          </ContextMenuRadioItem>
          <ContextMenuRadioItem value="colm" data-testid="colm-radio">
            Colm Tuite
          </ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 🎯 목적: Context Menu의 서브메뉴 열기, 체크박스/라디오 아이템 토글 기능 확인

    // 트리거 우클릭하여 컨텍스트 메뉴 열기
    const trigger = canvas.getByTestId("context-trigger");
    await expect(trigger).toBeInTheDocument();

    await userEvent.pointer([
      { target: trigger },
      { keys: "[MouseRight]", target: trigger },
    ]);

    // 메뉴가 열렸는지 확인
    await waitFor(async () => {
      const backItem = await canvas.findByTestId("back-item");
      await expect(backItem).toBeInTheDocument();
    });

    // 서브메뉴 트리거 확인
    const submenuTrigger = canvas.getByTestId("submenu-trigger");
    await expect(submenuTrigger).toBeInTheDocument();

    // 서브메뉴 트리거에 호버하여 서브메뉴 열기
    await userEvent.hover(submenuTrigger);

    // 서브메뉴 아이템이 나타나는지 확인
    await waitFor(async () => {
      const savePageItem = await canvas.findByTestId("save-page-item");
      await expect(savePageItem).toBeInTheDocument();
    });

    // 서브메뉴에서 나가기
    await userEvent.unhover(submenuTrigger);

    // 체크박스 아이템 확인
    const bookmarksCheckbox = canvas.getByTestId("bookmarks-checkbox");
    await expect(bookmarksCheckbox).toBeInTheDocument();
    await expect(bookmarksCheckbox).toHaveAttribute("data-state", "checked");

    // 체크박스 클릭하여 토글 (checked → unchecked)
    await userEvent.click(bookmarksCheckbox);
    await expect(bookmarksCheckbox).toHaveAttribute("data-state", "unchecked");

    // 메뉴를 다시 열어서 라디오 아이템 테스트
    await userEvent.pointer([
      { target: trigger },
      { keys: "[MouseRight]", target: trigger },
    ]);

    await waitFor(async () => {
      const pedroRadio = await canvas.findByTestId("pedro-radio");
      await expect(pedroRadio).toBeInTheDocument();
    });

    // Pedro가 선택되어 있는지 확인
    const pedroRadio = canvas.getByTestId("pedro-radio");
    await expect(pedroRadio).toHaveAttribute("data-state", "checked");

    // Colm 선택
    const colmRadio = canvas.getByTestId("colm-radio");
    await userEvent.click(colmRadio);
    await expect(colmRadio).toHaveAttribute("data-state", "checked");
  },
};

export function ContextMenuDemo() {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm">
        Right click here
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem inset>
          Back
          <ContextMenuShortcut>⌘[</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset disabled>
          Forward
          <ContextMenuShortcut>⌘]</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset>
          Reload
          <ContextMenuShortcut>⌘R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>More Tools</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuItem>Save Page...</ContextMenuItem>
            <ContextMenuItem>Create Shortcut...</ContextMenuItem>
            <ContextMenuItem>Name Window...</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>Developer Tools</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked>
          Show Bookmarks
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem>Show Full URLs</ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup value="pedro">
          <ContextMenuLabel inset>People</ContextMenuLabel>
          <ContextMenuRadioItem value="pedro">
            Pedro Duarte
          </ContextMenuRadioItem>
          <ContextMenuRadioItem value="colm">Colm Tuite</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}
