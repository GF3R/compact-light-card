import { LitElement, css, html } from "lit";

interface CompactLightCardConfig {
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
        grid-template-columns: 1fr auto 140px;
        align-items: center;
        gap: 8px;
        padding: 6px 0;
      }
      .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      ha-slider {
        width: 140px;
      }
      .muted {
        color: var(--secondary-text-color);
      }
    `;
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
    this.hass.callService("light", "toggle", { entity_id: entityId });
  }

  private _setBrightness(entityId: string, value: number) {
    if (!this.hass) return;
    const brightness = Math.max(0, Math.min(255, value));
    this.hass.callService("light", "turn_on", { entity_id: entityId, brightness });
  }

  private _renderRow(entityId: string) {
    const stateObj = this.hass?.states?.[entityId];
    if (!stateObj) {
      return html`<div class="row muted">${entityId} not found</div>`;
    }

    const isOn = stateObj.state === "on";
    const brightness = stateObj.attributes?.brightness ?? 0;
    const name = stateObj.attributes?.friendly_name ?? entityId;

    return html`
      <div class="row">
        <div class="name">${name}</div>
        <ha-entity-toggle
          .hass=${this.hass}
          .stateObj=${stateObj}
          @click=${() => this._toggle(entityId)}
          title=${isOn ? "Turn off" : "Turn on"}
        ></ha-entity-toggle>
        <ha-slider
          .value=${brightness}
          .min=${0}
          .max=${255}
          .step=${5}
          @change=${(ev: Event) => {
            const target = ev.currentTarget as HTMLInputElement;
            this._setBrightness(entityId, Number(target.value));
          }}
        ></ha-slider>
      </div>
    `;
  }

  render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <ha-card header=${this._config.name ?? "Lights"}>
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
