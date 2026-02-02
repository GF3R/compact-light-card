import { LitElement, css, html } from "lit";

interface CompactLightCardConfig {
  type?: string;
  name?: string;
  entities: string[];
}

type HassEntity = {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
};

type HomeAssistant = {
  states: Record<string, HassEntity>;
  callService: (domain: string, service: string, data: Record<string, any>) => void;
};

class CompactLightCard extends LitElement {
  private _config?: CompactLightCardConfig;
  public hass?: HomeAssistant;
  private _brightnessOverrides: Record<string, number> = {};
  private _lastKnownBrightness: Record<string, number> = {};

  static get properties() {
    return {
      hass: {},
      _config: {}
    };
  }

  static get styles() {
    return css`
      ha-card {
        padding: 12px;
      }
      .row {
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr);
        align-items: center;
        gap: 8px;
        padding: 6px 0;
      }
      .icon {
        border: 0;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(var(--rgb-primary-color), 0.18);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-color);
        padding: 0;
        cursor: pointer;
      }
      .icon.on {
        background: rgba(var(--rgb-primary-color), 0.25);
        color: var(--accent-color);
      }
      .icon.off {
        background: rgba(var(--rgb-primary-color), 0.12);
        color: var(--secondary-text-color);
      }
      .label {
        display: grid;
        gap: 2px;
      }
      .name-toggle {
        display: inline-flex;
        align-items: center;
        border: 0;
        background: transparent;
        padding: 2px 0;
        font: inherit;
        text-align: left;
        cursor: pointer;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .slider-stack {
        display: grid;
        gap: 4px;
        margin-left: 1em;
      }
      .slider-name {
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .slider-percent {
        font-size: 12px;
        color: var(--secondary-text-color);
      }
      .percent {
        font-size: 12px;
        color: var(--secondary-text-color);
      }
      .name-toggle.on {
        color: var(--accent-color);
      }
      .name-toggle.off {
        color: var(--secondary-text-color);
      }
      ha-slider {
        width: 100%;
     }  
      ha-slider.on {
        --ha-slider-thumb-color: var(--accent-color);
        --ha-slider-indicator-color: var(--accent-color);
        --paper-slider-knob-width: 12px;
        --paper-slider-knob-height: 12px;
      }
      ha-slider.off {
        --ha-slider-thumb-color: var(--secondary-text-color);
        --ha-slider-indicator-color: var(--secondary-text-color);
        --paper-slider-knob-width: 12px;
        --paper-slider-knob-height: 12px;
      }
      .muted {
        color: var(--secondary-text-color);
      }
    `;
  }

  static getConfigElement() {
    return document.createElement("compact-light-card-editor");
  }

  static getStubConfig() {
    return {
      name: "Lights",
      entities: []
    };
  }

  setConfig(config: CompactLightCardConfig) {
    if (!config || !Array.isArray(config.entities) || config.entities.length === 0) {
      throw new Error("Please define at least one entity.");
    }
    this._config = config;
  }

  getCardSize() {
    return (this._config?.entities?.length ?? 1) + 1;
  }

  private _toggle(entityId: string) {
    if (!this.hass) return;
    const stateObj = this.hass.states?.[entityId];
    const isOn = stateObj?.state === "on";
    if (isOn) {
      this.hass.callService("light", "turn_off", { entity_id: entityId });
      return;
    }
    const lastKnown = this._lastKnownBrightness[entityId];
    if (typeof lastKnown === "number" && lastKnown > 0) {
      this._brightnessOverrides = { ...this._brightnessOverrides, [entityId]: lastKnown };
    }
    this.hass.callService("light", "toggle", { entity_id: entityId });
  }

  private _setBrightness(entityId: string, value: number) {
    if (!this.hass) return;
    const brightness = Math.max(0, Math.min(255, value));
    this._brightnessOverrides = { ...this._brightnessOverrides, [entityId]: brightness };
    this.hass.callService("light", "turn_on", { entity_id: entityId, brightness });
  }

  private _handleBrightnessInput(entityId: string, value: number) {
    const brightness = Math.max(0, Math.min(255, value));
    this._brightnessOverrides = { ...this._brightnessOverrides, [entityId]: brightness };
    this.requestUpdate();
  }

  private _renderRow(entityId: string) {
    const stateObj = this.hass?.states?.[entityId];
    if (!stateObj) {
      return html`<div class="row muted">${entityId} not found</div>`;
    }

    const isOn = stateObj.state === "on";
    const brightnessAttr = stateObj.attributes?.brightness;
    const brightnessPctAttr = stateObj.attributes?.brightness_pct;
    const supportedColorModes = stateObj.attributes?.supported_color_modes;
    const supportsBrightness =
      Array.isArray(supportedColorModes) && supportedColorModes.length > 0
        ? supportedColorModes.some((mode: string) => mode !== "onoff")
        : false;
    const brightnessFromPct =
      typeof brightnessPctAttr === "number"
        ? Math.round((brightnessPctAttr / 100) * 255)
        : undefined;
    const resolvedBrightnessAttr =
      typeof brightnessAttr === "number" ? brightnessAttr : brightnessFromPct;
    if (typeof resolvedBrightnessAttr === "number") {
      this._lastKnownBrightness = {
        ...this._lastKnownBrightness,
        [entityId]: resolvedBrightnessAttr
      };
    }
    const override = this._brightnessOverrides[entityId];
    if (
      typeof override === "number" &&
      typeof resolvedBrightnessAttr === "number" &&
      Math.abs(resolvedBrightnessAttr - override) <= 1
    ) {
      const nextOverrides = { ...this._brightnessOverrides };
      delete nextOverrides[entityId];
      this._brightnessOverrides = nextOverrides;
    }
    const brightness =
      typeof override === "number"
        ? override
        : typeof resolvedBrightnessAttr === "number"
        ? resolvedBrightnessAttr
        : typeof this._lastKnownBrightness[entityId] === "number"
        ? this._lastKnownBrightness[entityId]
        : isOn && !supportsBrightness
        ? 255
        : 0;
    const name = stateObj.attributes?.friendly_name ?? entityId;
    const percent = Math.round((brightness / 255) * 100);
    return html`
      <div class="row">
        <button
          class="icon ${isOn ? "on" : "off"}"
          @click=${() => this._toggle(entityId)}
          type="button"
        >
          <ha-icon icon="mdi:lightbulb"></ha-icon>
        </button>
        <div class="slider-stack">
          <button
            class="slider-name name-toggle ${isOn ? "on" : "off"}"
            @click=${() => this._toggle(entityId)}
            type="button"
          >
            ${name}
          </button>
          <ha-slider
            class=${isOn ? "on" : "off"}
            .value=${brightness}
            .min=${0}
            .max=${255}
            .step=${5}
            @input=${(ev: Event) => {
              const target = ev.currentTarget as HTMLInputElement;
              this._handleBrightnessInput(entityId, Number(target.value));
            }}
            @change=${(ev: Event) => {
              const target = ev.currentTarget as HTMLInputElement;
              this._setBrightness(entityId, Number(target.value));
            }}
          ></ha-slider>
          <div class="slider-percent">${percent}%</div>
        </div>
      </div>
    `;
  }

  render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <ha-card>
        ${this._config.entities.map((entityId) => this._renderRow(entityId))}
      </ha-card>
    `;
  }
}

customElements.define("compact-light-card", CompactLightCard);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "compact-light-card",
  name: "Compact Light Card",
  description: "Show multiple lights with sliders in one card.",
  preview: true
});

class CompactLightCardEditor extends LitElement {
  public hass?: HomeAssistant;
  private _config?: CompactLightCardConfig;

  static get properties() {
    return {
      hass: { attribute: false },
      _config: { state: true },
    };
  }

  static styles = css`
    .form {
      display: grid;
      gap: 12px;
    }
  `;

  setConfig(config: CompactLightCardConfig) {
    this._config = {
      type: config.type ?? "custom:compact-light-card",
      name: config.name ?? "",
      entities: Array.isArray(config.entities) ? [...config.entities] : [],
    };
  }

  private _emit(config: CompactLightCardConfig) {
    const next: CompactLightCardConfig = {
      ...config,
      type: config.type || "custom:compact-light-card",
      entities: (config.entities ?? []).map((e) => (e ?? "").trim()).filter(Boolean),
    };

    this._config = next;

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: next },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _valueChanged(ev: CustomEvent) {
    // ha-form emits { value: { ...updatedConfig } }
    const value = ev.detail?.value;
    if (!value) return;

    this._emit({
      ...this._config!,
      ...value,
    });
  }

  render() {
    if (!this._config || !this.hass) return null;

    const schema = [
      {
        name: "name",
        label: "Card name",
        selector: { text: {} },
      },
      {
        name: "entities",
        label: "Lights",
        selector: {
          entity: {
            domain: "light",
            multiple: true,   // ✅ multi select
          },
        },
      },
    ];

    return html`
      <div class="form">
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${schema}
          @value-changed=${this._valueChanged}
        ></ha-form>
      </div>
    `;
  }
}

customElements.define("compact-light-card-editor", CompactLightCardEditor);
