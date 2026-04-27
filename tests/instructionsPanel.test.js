import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import InstructionsPanel from '../src/components/InstructionsPanel.vue';

afterEach(() => {
  document.querySelectorAll('[role="dialog"]').forEach((n) => n.remove());
});

describe('InstructionsPanel rendering', () => {
  it('renders a dialog with role=dialog and aria-modal=true', () => {
    const wrapper = mount(InstructionsPanel, { attachTo: document.body });
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    wrapper.unmount();
  });

  it('shows a heading "How to play"', () => {
    const wrapper = mount(InstructionsPanel, { attachTo: document.body });
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const heading = dialog.querySelector('h2');
    expect(heading).not.toBeNull();
    expect(heading.textContent.toLowerCase()).toContain('how to play');
    wrapper.unmount();
  });

  it('uses aria-labelledby to point to the heading element', () => {
    const wrapper = mount(InstructionsPanel, { attachTo: document.body });
    const dialog = document.querySelector('[role="dialog"]');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const labelEl = document.getElementById(labelledBy);
    expect(labelEl).not.toBeNull();
    expect(labelEl.textContent.toLowerCase()).toContain('how to play');
    wrapper.unmount();
  });

  it('focuses the close button on mount', async () => {
    const wrapper = mount(InstructionsPanel, { attachTo: document.body });
    await wrapper.vm.$nextTick();
    const closeBtn = document.querySelector('[data-testid="close-instructions"]');
    expect(document.activeElement).toBe(closeBtn);
    wrapper.unmount();
  });

  it('renders content describing the no-simple-additions rule', () => {
    const wrapper = mount(InstructionsPanel, { attachTo: document.body });
    const dialog = document.querySelector('[role="dialog"]');
    const text = dialog.textContent.toLowerCase();
    const mentionsRule =
      text.includes('plural') ||
      text.includes('simple') ||
      text.includes('rearrange') ||
      text.includes("doesn't count") ||
      text.includes('no trivial');
    expect(mentionsRule).toBe(true);
    wrapper.unmount();
  });

  it('does not contain any scoring or points language in the body', () => {
    const wrapper = mount(InstructionsPanel, { attachTo: document.body });
    const dialog = document.querySelector('[role="dialog"]');
    const text = dialog.textContent.toLowerCase();
    expect(text).not.toMatch(/score/);
    expect(text).not.toMatch(/points/);
    expect(text).not.toMatch(/penalty/);
    wrapper.unmount();
  });
});

describe('InstructionsPanel dismissal', () => {
  it('emits close when the close button is clicked', async () => {
    const wrapper = mount(InstructionsPanel, { attachTo: document.body });
    const closeBtn = document.querySelector('[data-testid="close-instructions"]');
    closeBtn.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('close')).toBeTruthy();
    wrapper.unmount();
  });

  it('emits close on Escape keydown', async () => {
    const wrapper = mount(InstructionsPanel, { attachTo: document.body });
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('close')).toBeTruthy();
    wrapper.unmount();
  });

  it('emits close on Enter keydown', async () => {
    const wrapper = mount(InstructionsPanel, { attachTo: document.body });
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('close')).toBeTruthy();
    wrapper.unmount();
  });

  it('emits close when the backdrop is clicked', async () => {
    const wrapper = mount(InstructionsPanel, { attachTo: document.body });
    const overlay = document.querySelector('.instructions-overlay');
    expect(overlay).not.toBeNull();
    overlay.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true })
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('close')).toBeTruthy();
    wrapper.unmount();
  });

  it('does NOT emit close when clicking inside the modal card', async () => {
    const wrapper = mount(InstructionsPanel, { attachTo: document.body });
    const card = document.querySelector('.instructions-panel');
    expect(card).not.toBeNull();
    card.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true })
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('close')).toBeFalsy();
    wrapper.unmount();
  });

  it('does not produce orphan close events after unmount', async () => {
    const wrapper = mount(InstructionsPanel, { attachTo: document.body });
    const beforeUnmountCount = (wrapper.emitted('close') ?? []).length;
    wrapper.unmount();

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );

    const afterUnmountCount = (wrapper.emitted('close') ?? []).length;
    expect(afterUnmountCount).toBe(beforeUnmountCount);
  });
});
