(ns metabase.notification.test-util
  "Define the `metabase-test` channel and notification test utilities."
  (:require
   [clojure.set :as set]
   [metabase.channel.core :as channel]
   [metabase.events.notification :as events.notification]
   [metabase.models.notification :as models.notification]
   [metabase.notification.core :as notification]
   [metabase.notification.payload.core :as notification.payload]
   [metabase.test :as mt]
   [metabase.util :as u]
   [toucan2.core :as t2]))

(def test-channel-type
  "The channel type for the test channel."
  "channel/metabase-test")

(defmethod channel/can-connect? (keyword test-channel-type)
  [_channel-type {:keys [return-type return-value] :as _details}]
  (case return-type
    "throw"
    (throw (ex-info "Test error" return-value))

    "return-value"
    return-value))

(defmethod channel/send! (keyword test-channel-type)
  [_channel message]
  message)

(defmethod channel/render-notification [:channel/metabase-test :notification/testing]
  [_channel-type notification-info _template _recipients]
  [notification-info])

(defmethod notification.payload/payload :notification/testing
  [_notification]
  {::payload? true})

(defmacro with-send-notification-sync
  "Notifications are sent async by default, wrap the body in this macro to send them synchronously."
  [& body]
  `(binding [notification/*default-options* {:notification/sync? true}]
     ~@body))

(defn do-with-captured-channel-send!
  [thunk]
  (with-send-notification-sync
    (let [channel-messages (atom {})]
      (with-redefs [channel/send! (fn [channel message]
                                    (swap! channel-messages update (:type channel) u/conjv message))]
        (thunk)
        @channel-messages))))

(defmacro with-captured-channel-send!
  "Macro that captures all messages sent to channels in the body of the macro.
  Returns a map of channel-type -> messages sent to that channel.

  (with-captured-channel-send!
  (channel/send! {:type :channel/email} {:say :hi})
  (channel/send! {:type :channel/email} {:say :xin-chao}))

  @captured-messages
  ;; => {:channel/email [{:say :hi} {:say :xin-chao}]}"
  [& body]
  `(do-with-captured-channel-send!
    (fn []
      ~@body)))

(defmacro with-temporary-event-topics!
  "Temporarily make `topics` valid event topics."
  [topics & body]
  `(let [topics# ~topics]
     (try
       (doseq [topic# topics#]
         (derive topic# :metabase/event))
       (with-redefs [events.notification/supported-topics (set/union @#'events.notification/supported-topics topics#)]
         ~@body)
       (finally
         (doseq [topic# topics#]
           (underive topic# :metabase/event))))))

(defmacro with-notification-cleanup!
  "Macro that clean ups notification related models"
  [& body]
  `(mt/with-model-cleanup [:model/Notification
                           :model/NotificationCard
                           :model/NotificationHandler
                           :model/NotificationSubscription
                           :model/NotificationRecipient]
     ~@body))

(defmacro with-notification-testing-setup!
  "Macro that sets up the notification testing environment."
  [& body]
  `(with-notification-cleanup!
     (with-send-notification-sync
       ~@body)))

#_{:clj-kondo/ignore [:metabase/test-helpers-use-non-thread-safe-functions]}
(defn do-with-card-notification
  [{:keys [card notification-card notification subscriptions handlers]} thunk]
  (mt/with-temp
    [:model/Card {card-id :id} card]
    (let [notification (models.notification/create-notification!
                        (merge {:payload      (assoc notification-card
                                                     :card_id card-id)
                                :payload_type :notification/card
                                :creator_id   (mt/user->id :crowberto)}
                               notification)
                        subscriptions
                        handlers)]
      (try
        (thunk (models.notification/hydrate-notification notification))
        (finally
          (t2/delete! :model/Notification (:id notification)))))))

(defmacro with-card-notification
  "Macro that sets up a card notification for testing.
    (with-card-notification
      [notification {:card              {:name \"My Card\"}
                     :notification-card {:send_condition :rows}
                     :subscriptions     []
                     :handlers          []}]"
  [[bindings props] & body]
  `(do-with-card-notification ~props (fn [~bindings] ~@body)))

;; ------------------------------------------------------------------------------------------------;;
;;                                         Dummy Data                                              ;;
;; ------------------------------------------------------------------------------------------------;;

;; :model/Channel
(def default-can-connect-channel
  "A :model/Channel that can connect."
  {:name        "Test channel"
   :description "Test channel description"
   :type        test-channel-type
   :details     {:return-type  "return-value"
                 :return-value true}
   :active      true})

(def channel-template-email-with-handlebars-body
  "A :model/ChannelTemplate for email channels that has a :event/handlebars-text template."
  {:channel_type :channel/email
   :details      {:type    :email/handlebars-text
                  :subject "Welcome {{payload.event_info.object.first_name}} to {{context.site_name}}"
                  :body    "Hello {{payload.event_info.object.first_name}}! Welcome to {{context.site_name}}!"}})
